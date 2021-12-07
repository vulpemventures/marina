import { balances } from 'ldk';
import { RootReducerState } from '../../../domain/common';

export type BalancesByAsset = { [assetHash: string]: number };
/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function balancesSelector(state: RootReducerState): BalancesByAsset {
  const utxos = Object.values(state.wallet.utxoMap);
  return balances(utxos);
}
