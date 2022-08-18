import type { NetworkString, UnblindedOutput } from 'ldk';
import type {
  MarinaEvent,
  NewTxMarinaEvent,
  NewUtxoMarinaEvent,
  SpentUtxoMarinaEvent,
} from '../application/utils/marina-event';
import {
  compareEnabledWebsites,
  compareTxsHistoryState,
  compareUtxoState,
  networkChange,
} from '../application/utils/marina-event';
import { MainAccountID } from '../domain/account';
import type { RootReducerState } from '../domain/common';
import type { TxsHistory } from '../domain/transaction';

export interface StoreCacheAccount {
  utxoState: Record<string, UnblindedOutput>;
  txsHistoryState: TxsHistory;
}

export interface StoreCache {
  accounts: Record<string, StoreCacheAccount>;
  enabledWebsitesState: Record<NetworkString, string[]>;
  network: NetworkString;
}

export function newStoreCache(): StoreCache {
  const accounts: Record<string, StoreCacheAccount> = {}
  accounts[MainAccountID] = {
    utxoState: {},
    txsHistoryState: {},
  }
  return {
    accounts,
    enabledWebsitesState: { regtest: [], liquid: [], testnet: [] },
    network: 'liquid',
  };
}

// compare a state with a store's cache.
// returns the MarinaEvents to emit.
export function compareCacheForEvents(
  newCache: StoreCache,
  oldCache: StoreCache,
  hostname: string, // for ENABLED and DISABLED events
  allAccountsIDs: string[] // for UTXO and TX events
): MarinaEvent<any>[] {
  const txsEvents: NewTxMarinaEvent[] = [];
  const utxosEvents: (NewUtxoMarinaEvent | SpentUtxoMarinaEvent)[] = [];
  for (const accountID of allAccountsIDs) {
    compareUtxoState(
      oldCache.accounts[accountID]?.utxoState || {},
      newCache.accounts[accountID]?.utxoState || {},
      accountID
    ).map((ev) => utxosEvents.push(ev));
    compareTxsHistoryState(
      oldCache.accounts[accountID]?.txsHistoryState || {},
      newCache.accounts[accountID]?.txsHistoryState || {},
      accountID
    ).map((ev) => txsEvents.push(ev));
  }
  const enabledAndDisabledEvents = compareEnabledWebsites(
    oldCache.enabledWebsitesState,
    newCache.enabledWebsitesState,
    hostname
  );
  const networkEvents = networkChange(oldCache.network, newCache.network);

  return [...utxosEvents, ...txsEvents, ...enabledAndDisabledEvents, ...networkEvents];
}

// create cache from State.
export function newCacheFromState(state: RootReducerState, allAccountsIDs: string[]): StoreCache {
  const accounts: Record<string, StoreCacheAccount> = {};
  for (const accountID of allAccountsIDs) {
    const root = state.wallet.unspentsAndTransactions[accountID][state.app.network];
    accounts[accountID] = {
      utxoState: root.utxosMap,
      txsHistoryState: root.transactions,
    };
  }
  return {
    accounts,
    enabledWebsitesState: state.connect.enabledSites,
    network: state.app.network,
  };
}
