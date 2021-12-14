import { balances, getAsset, isUnblindedOutput, TxInterface } from 'ldk';
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
    const balancesFromUtxos = balances(utxos);

    const txs = selectTransactions(accountID)(state);
    const assets = Object.keys(balancesFromUtxos);

    for (const tx of txs) {
      const allTxAssets = getSetOfAssetsInTx(tx);
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

function getSetOfAssetsInTx(tx: TxInterface): Set<string> {
  const assets = new Set<string>();
  for (const input of tx.vin) {
    if (input.prevout && isUnblindedOutput(input.prevout)) {
      assets.add(getAsset(input.prevout));
    }
  }

  for (const output of tx.vout.filter(isUnblindedOutput)) {
    assets.add(getAsset(output));
  }

  return assets;
}
