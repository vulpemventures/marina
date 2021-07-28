import { RootReducerState } from '../../../domain/common';
import { lbtcAssetByNetwork } from '../../utils';
import { walletTransactions } from './transaction.selector';

export type BalancesByAsset = { [assetHash: string]: number };
/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function balancesSelector(state: RootReducerState): BalancesByAsset {
  const utxos = Object.values(state.wallet.utxoMap);
  const balancesFromUtxos = utxos.reduce((acc, curr) => {
    if (!curr.asset || !curr.value) {
      return acc;
    }
    return { ...acc, [curr.asset]: curr.value + (curr.asset in acc ? acc[curr.asset] : 0) };
  }, {} as BalancesByAsset);

  const txs = walletTransactions(state);
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
}
