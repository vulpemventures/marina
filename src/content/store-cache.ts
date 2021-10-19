import { UtxoInterface } from 'ldk';
import {
  MarinaEvent,
  compareEnabledWebsites,
  compareTxsHistoryState,
  compareUtxoState,
  networkChange,
} from '../application/utils/marina-event';
import { MainAccountID } from '../domain/account';
import { RootReducerState } from '../domain/common';
import { Network } from '../domain/network';
import { TxsHistory } from '../domain/transaction';

export interface StoreCache {
  utxoState: Record<string, UtxoInterface>;
  txsHistoryState: TxsHistory;
  enabledWebsitesState: Record<Network, string[]>;
  network: Network;
}

export function newStoreCache(): StoreCache {
  return {
    utxoState: {},
    txsHistoryState: {},
    enabledWebsitesState: { regtest: [], liquid: [] },
    network: 'liquid',
  };
}

// compare a state with a store's cache.
// returns the MarinaEvents to emit.
export function compareCacheForEvents(
  newCache: StoreCache,
  oldCache: StoreCache,
  hostname: string // for ENABLED and DISABLED events
): MarinaEvent<any>[] {
  const utxosEvents = compareUtxoState(oldCache.utxoState, newCache.utxoState);
  const txsEvents = compareTxsHistoryState(oldCache.txsHistoryState, newCache.txsHistoryState);
  const enabledAndDisabledEvents = compareEnabledWebsites(
    oldCache.enabledWebsitesState,
    newCache.enabledWebsitesState,
    hostname
  );
  const networkEvents = networkChange(oldCache.network, newCache.network);

  return [...utxosEvents, ...txsEvents, ...enabledAndDisabledEvents, ...networkEvents];
}

// create cache from State.
export function newCacheFromState(state: RootReducerState): StoreCache {
  return {
    utxoState: state.wallet.unspentsAndTransactions[MainAccountID].utxosMap,
    txsHistoryState:
      state.wallet.unspentsAndTransactions[MainAccountID].transactions[state.app.network],
    enabledWebsitesState: state.connect.enabledSites,
    network: state.app.network,
  };
}
