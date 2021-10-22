import axios from 'axios';
import {
  address,
  AddressInterface,
  BlindingKeyGetter,
  fetchAndUnblindTxsGenerator,
  fetchAndUnblindUtxosGenerator,
  isBlindedUtxo,
  networks,
  utxoWithPrevout,
} from 'ldk';
import { Store } from 'redux';
import { addAsset } from '../application/redux/actions/asset';
import { addTx } from '../application/redux/actions/transaction';
import { addUtxo, deleteUtxo } from '../application/redux/actions/utxos';
import { getExplorerURLSelector } from '../application/redux/selectors/app.selector';
import { selectUnspentsAndTransactions } from '../application/redux/selectors/wallet.selector';
import { defaultPrecision, toDisplayTransaction, toStringOutpoint } from '../application/utils';
import { Account } from '../domain/account';
import { RootReducerState } from '../domain/common';

type AccountSelector = (state: RootReducerState) => Account | undefined;

/**
 * fetch the asset infos from explorer (ticker, precision etc...)
 */
async function fetchAssetInfos(
  assetHash: string,
  explorerUrl: string,
  store: Store<RootReducerState>
) {
  if (store.getState().assets[assetHash] !== undefined) return; // do not update

  const assetInfos = (await axios.get(`${explorerUrl}/asset/${assetHash}`)).data;
  const name = assetInfos?.name ? assetInfos.name : 'Unknown';
  const ticker = assetInfos?.ticker ? assetInfos.ticker : assetHash.slice(0, 4).toUpperCase();
  const precision = assetInfos.precision !== undefined ? assetInfos.precision : defaultPrecision;

  store.dispatch(addAsset(assetHash, { name, ticker, precision }));
}

async function getAddressesFromAccount(account: Account): Promise<AddressInterface[]> {
  return (await account.getWatchIdentity()).getAddresses();
}

// fetch and unblind the utxos and then refresh it.
export function makeUtxosUpdater(
  selectAccount: AccountSelector
): (store: Store<RootReducerState>) => Promise<void> {
  return async (store: Store<RootReducerState>) => {
    try {
      const state = store.getState();
      const dispatch = store.dispatch;
      const { app } = state;
      if (!app.isAuthenticated) return;

      const account = selectAccount(state);
      if (!account) return;
      const explorer = getExplorerURLSelector(state);
      const currentCacheState = selectUnspentsAndTransactions(account.getAccountID())(state);
      const utxosMap = currentCacheState === undefined ? {} : currentCacheState.utxosMap;

      const currentOutpoints = Object.values(utxosMap || {}).map(({ txid, vout }) => ({
        txid,
        vout,
      }));

      const skippedOutpoints: string[] = []; // for deleting

      // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
      const utxos = fetchAndUnblindUtxosGenerator(
        await getAddressesFromAccount(account),
        explorer,
        // Skip unblinding if utxo exists in current state
        (utxo) => {
          const outpoint = toStringOutpoint(utxo);
          const skip = utxosMap[outpoint] !== undefined;

          if (skip) skippedOutpoints.push(toStringOutpoint(utxo));

          return skip;
        }
      );

      let utxoIterator = await utxos.next();
      while (!utxoIterator.done) {
        let utxo = utxoIterator?.value;
        if (!isBlindedUtxo(utxo)) {
          if (utxo.asset) {
            await fetchAssetInfos(utxo.asset, explorer, store).catch(console.error);
          }

          if (!utxo.prevout) {
            utxo = await utxoWithPrevout(utxo, explorer);
          }

          dispatch(addUtxo(account.getAccountID(), utxo));
        }
        utxoIterator = await utxos.next();
      }

      if (utxoIterator.done) {
        console.info(`number of utxos fetched: ${utxoIterator.value.numberOfUtxos}`);
        if (utxoIterator.value.errors.length > 0) {
          console.warn(
            `${utxoIterator.value.errors.length} errors occurs during utxos updater generator`
          );
        }
      }

      for (const outpoint of currentOutpoints) {
        if (skippedOutpoints.includes(toStringOutpoint(outpoint))) continue;
        // if not skipped, it means the utxo has been spent
        dispatch(deleteUtxo(account.getAccountID(), outpoint.txid, outpoint.vout));
      }
    } catch (error) {
      console.error(`fetchAndUpdateUtxos error: ${error}`);
    }
  };
}

/**
 * use fetchAndUnblindTxsGenerator to update the tx history
 */
export function makeTxsUpdater(
  selectAccount: AccountSelector
): (store: Store<RootReducerState>) => Promise<void> {
  return async (store: Store<RootReducerState>) => {
    try {
      const state = store.getState();
      const { app } = state;
      if (!app.isAuthenticated) return;

      const account = selectAccount(state);
      if (!account) return;
      const txsHistory = selectUnspentsAndTransactions(account.getAccountID())(state).transactions[
        app.network
      ];

      // Initialize txs to txsHistory shallow clone
      const addressInterfaces = await getAddressesFromAccount(account);
      const walletScripts = addressInterfaces.map((a) =>
        address.toOutputScript(a.confidentialAddress).toString('hex')
      );

      const explorer = getExplorerURLSelector(state);

      const identityBlindKeyGetter: BlindingKeyGetter = (script: string) => {
        try {
          const addressFromScript = address.fromOutputScript(
            Buffer.from(script, 'hex'),
            networks[app.network]
          );
          return addressInterfaces.find(
            (addr) =>
              address.fromConfidential(addr.confidentialAddress).unconfidentialAddress ===
              addressFromScript
          )?.blindingPrivateKey;
        } catch (_) {
          return undefined;
        }
      };

      const txsGen = fetchAndUnblindTxsGenerator(
        addressInterfaces.map((a) => a.confidentialAddress),
        identityBlindKeyGetter,
        explorer,
        // Check if tx exists in React state
        (tx) => txsHistory[tx.txid] !== undefined
      );

      let it = await txsGen.next();

      // If no new tx already in state then return txsHistory of current network
      if (it.done) {
        return;
      }

      while (!it.done) {
        const tx = it.value;
        // Update all txsHistory state at each single new tx
        const toAdd = toDisplayTransaction(tx, walletScripts, networks[app.network]);
        store.dispatch(addTx(account.getAccountID(), toAdd, app.network));
        it = await txsGen.next();
      }
    } catch (error) {
      console.error(`fetchAndUnblindTxs: ${error}`);
    }
  };
}
