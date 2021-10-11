import { createSelector } from 'reselect';
import { RootReducerState } from '../../../domain/common';

export const selectAllTransactions = createSelector(
  [(state: RootReducerState) => state.txsHistory[state.app.network]],
  (txs) => Object.values(txs)
);

const selectAllTransactionsAssets = createSelector([selectAllTransactions], (txs) =>
  txs.flatMap((tx) => tx.transfers.map((trans) => trans.asset))
);

export const selectAllUniqueTransactionsAssets = createSelector(
  [selectAllTransactionsAssets],
  (assets) => Array.from(new Set(assets))
);
