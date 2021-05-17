import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import {
  TXS_HISTORY_SET_TXS_SUCCESS,
} from './action-types';
import {
  BlindingKeyGetter,
  fetchAndUnblindTxsGenerator,
  fromXpub,
  IdentityType,
  MasterPublicKey,
  networks,
} from 'ldk';
import { explorerApiUrl, IdentityRestorerFromState } from '../../utils';
import { TxsHistory } from '../../../domain/transaction';
import { address as addressLDK } from 'liquidjs-lib';
import { RootState } from '../store';

/**
 * Update transaction history of current network
 * @param onSuccess
 * @param onError
 */
export function updateTxsHistory(
  onSuccess?: (txs: TxsHistory) => void,
  onError?: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const { app, txsHistory, wallets } = getState();
      // Initialize txs to txsHistory shallow clone
      const txs: TxsHistory = { ...txsHistory[app.network] } ?? {};
      const { confidentialAddresses, masterBlindingKey, masterXPub } = wallets[0];
      const addresses = confidentialAddresses.map((addr) => addr.value);
      const restorer = new IdentityRestorerFromState(addresses);
      const pubKeyWallet = new MasterPublicKey({
        chain: app.network,
        restorer,
        type: IdentityType.MasterPublicKey,
        value: {
          masterPublicKey: fromXpub(masterXPub, app.network),
          masterBlindingKey: masterBlindingKey,
        },
        initializeFromRestorer: true
      });

      const isRestored = await pubKeyWallet.isRestored;
      if (!isRestored) {
        throw new Error('Failed to restore wallet');
      }

      const addressInterfaces = await pubKeyWallet.getAddresses();
      const identityBlindKeyGetter: BlindingKeyGetter = (script: string) => {
        try {
          const address = addressLDK.fromOutputScript(
            Buffer.from(script, 'hex'),
            networks[app.network]
          );
          return addressInterfaces.find(
            (addr) =>
              addressLDK.fromConfidential(addr.confidentialAddress).unconfidentialAddress ===
              address
          )?.blindingPrivateKey;
        } catch (_) {
          return undefined;
        }
      };

      const txsGen = fetchAndUnblindTxsGenerator(
        addresses,
        identityBlindKeyGetter,
        explorerApiUrl[app.network],
        // Check if tx exists in React state
        (tx) => txsHistory[app.network][tx.txid] !== undefined
      );

      const next = () => txsGen.next();
      let it = await next();

      // If no new tx already in state then return txsHistory of current network
      if (it.done) {
        onSuccess?.(txsHistory[app.network]);
        return;
      }

      while (!it.done) {
        const tx = it.value;
        // Update all txsHistory state at each single new tx
        txs[tx.txid] = tx;
        dispatch({ type: TXS_HISTORY_SET_TXS_SUCCESS, payload: { txs, network: app.network } });
        it = await next();
      }
      onSuccess?.(txs);
    } catch (error) {
      onError?.(error);
    }
  };
}
