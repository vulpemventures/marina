import {
  INIT_TXS_HISTORY,
  TXS_HISTORY_SET_TXS_SUCCESS,
  TXS_HISTORY_UPDATE_FAILURE,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';
import {
  BlindingKeyGetter,
  fetchAndUnblindTxsGenerator,
  fromXpub,
  IdentityType,
  MasterPublicKey,
  networks,
} from 'ldk';
import { explorerApiUrl, IdentityRestorerFromState } from '../../utils';
import { TxsHistory, TxsHistoryByNetwork } from '../../../domain/transaction';
import { address as addressLDK } from 'liquidjs-lib';

export function initTxsHistoryByNetwork(
  txsHistoryByNetwork: TxsHistoryByNetwork
): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([INIT_TXS_HISTORY, { ...txsHistoryByNetwork }]);
  };
}

/**
 * Update transaction history of current network
 * @param onSuccess
 * @param onError
 */
export function updateTxsHistory(
  onSuccess?: (txs: TxsHistory) => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    try {
      const { app, txsHistory, wallets } = getState();
      // Initialize txs to txsHistory shallow clone
      const txs: TxsHistory = { ...txsHistory[app.network.value] } ?? {};
      const { confidentialAddresses, masterBlindingKey, masterXPub } = wallets[0];
      const addresses = confidentialAddresses.map((addr) => addr.value);
      const restorer = new IdentityRestorerFromState(addresses);
      const pubKeyWallet = new MasterPublicKey({
        chain: app.network.value,
        restorer,
        type: IdentityType.MasterPublicKey,
        value: {
          masterPublicKey: fromXpub(masterXPub.value, app.network.value),
          masterBlindingKey: masterBlindingKey.value,
        },
        initializeFromRestorer: true,
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
            networks[app.network.value]
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
        explorerApiUrl[app.network.value],
        // Check if tx exists in React state
        (tx) => txsHistory[app.network.value][tx.txid] !== undefined
      );

      const next = () => txsGen.next();
      let it = await next();

      // If no new tx already in state then return txsHistory of current network
      if (it.done) {
        onSuccess?.(txsHistory[app.network.value]);
        return;
      }

      while (!it.done) {
        const tx = it.value;
        // Update all txsHistory state at each single new tx
        txs[tx.txid] = tx;
        dispatch([TXS_HISTORY_SET_TXS_SUCCESS, { txs, network: app.network.value }]);
        it = await next();
      }
      // Update browser storage with all tx history of this network
      await repos.txsHistory.addTxsHistory(txs, app.network.value);
      onSuccess?.(txs);
    } catch (error) {
      dispatch([TXS_HISTORY_UPDATE_FAILURE, { error }]);
      onError?.(error);
    }
  };
}
