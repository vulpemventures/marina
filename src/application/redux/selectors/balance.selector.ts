import { selectAllUniqueTransactionsAssets } from './transaction.selector';
import { createSelector } from 'reselect';
import type { UtxoInterface } from 'ldk';
import { selectLBTCforNetwork } from './app.selector';
import { selectAllUnspents } from './wallet.selector';

export type BalancesByAsset = { [assetHash: string]: number };

function balancesReducer(balances: BalancesByAsset, utxo: UtxoInterface) {
  if (!utxo.asset || !utxo.value) {
    return balances;
  }
  return {
    ...balances,
    [utxo.asset]: utxo.value + (utxo.asset in balances ? balances[utxo.asset] : 0),
  };
}

const selectBalancesFromUnspents = createSelector([selectAllUnspents], (utxos) =>
  utxos.reduce(balancesReducer, {})
);

// Extract balances from all unblinded utxos in state
// it also fill with balance = 0 if wallet contains txs of a given asset
// always return at least one balance = LBTC balance (0 if no utxos)
export const selectBalances = createSelector(
  [selectBalancesFromUnspents, selectAllUniqueTransactionsAssets, selectLBTCforNetwork],
  (balancesFromUtxos, transactionsAssets, assetHashLBTC) => {
    const balances = balancesFromUtxos;
    const balanceAssets = new Set(Object.keys(balancesFromUtxos));
    for (const asset of transactionsAssets) {
      if (balanceAssets.has(asset)) continue;
      balances[asset] = 0;
    }

    if (balances[assetHashLBTC] === undefined) {
      balances[assetHashLBTC] = 0;
    }

    return balances;
  }
);
