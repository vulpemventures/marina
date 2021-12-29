import { balances } from 'ldk';
import { RootReducerState } from '../../../domain/common';
import { lbtcAssetByNetwork } from '../../utils';

export type BalancesByAsset = { [assetHash: string]: number };
/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function balancesSelector(state: RootReducerState): BalancesByAsset {
  const utxos = Object.values(state.wallet.utxoMap);
  const balancesFromUtxos = balances(utxos);

  const lbtcAssetHash = lbtcAssetByNetwork(state.app.network);
  if (!Object.prototype.hasOwnProperty.call(balancesFromUtxos, lbtcAssetHash)) {
    balancesFromUtxos[lbtcAssetHash] = 0;
  }

  return balancesFromUtxos;
}
