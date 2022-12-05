import { balances, getAsset, isUnblindedOutput } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { RootReducerState } from '../../../domain/common';
import { sumBalances } from '../../utils/balances';
import { lbtcAssetByNetwork } from '../../utils/network';
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
    const balancesFromUtxos = balances(utxos);

    const txs = selectTransactions(accountID)(state);
    const assets = Object.keys(balancesFromUtxos);
    console.log(txs);

    for (const tx of txs) {
      const allTxAssets = tx.vout.filter(isUnblindedOutput).map(getAsset);
      // init assets with 0 balance if not present
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
