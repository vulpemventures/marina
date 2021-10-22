import { AccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import { lbtcAssetByNetwork } from '../../utils';
import { sumBalances } from '../../utils/balances';
import { selectTransactions, selectUtxos } from './wallet.selector';

export type BalancesByAsset = { [assetHash: string]: number };

export const selectBalances = (...accounts: AccountID[]) => {
  const selectors = accounts.map((id) => selectBalancesForAccount(id));
  return (state: RootReducerState) => {
    return sumBalances(...selectors.map((select) => select(state)));
  };
};

/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
const selectBalancesForAccount =
  (accountID: AccountID) =>
  (state: RootReducerState): BalancesByAsset => {
    const utxos = selectUtxos(accountID)(state);
    const balancesFromUtxos = utxos.reduce((acc, curr) => {
      if (!curr.asset || !curr.value) {
        return acc;
      }
      return { ...acc, [curr.asset]: curr.value + (curr.asset in acc ? acc[curr.asset] : 0) };
    }, {} as BalancesByAsset);

    const txs = selectTransactions(accountID)(state);
    const assets = Object.keys(balancesFromUtxos);

    for (const tx of txs) {
      const allTxAssets = tx.transfers.map((t) => t.asset);
      for (const a of allTxAssets) {
        if (!assets.includes(a)) {
          balancesFromUtxos[a] = 0;
          assets.push(a);
        }
      }
    }

    const lbtcAssetHash = lbtcAssetByNetwork(state.app.network);

    if (balancesFromUtxos[lbtcAssetHash] === undefined) {
      balancesFromUtxos[lbtcAssetHash] = 0;
    }

    return balancesFromUtxos;
  };
