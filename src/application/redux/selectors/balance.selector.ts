import { RootReducerState } from "../../../domain/common";
import { lbtcAssetByNetwork } from "../../utils";

export type BalancesByAsset = { [assetHash: string]: number };

/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function balances(state: RootReducerState): BalancesByAsset {
  console.log('BALANCE SELECTOR')
  const utxos = Object.values(state.wallet.utxoMap);
  console.log(utxos)
  const balancesFromUtxos = utxos.reduce((acc, curr) => {
    if (!curr.asset || !curr.value) {
      return acc;
    }
    return { ...acc, [curr.asset]: curr.value + (curr.asset in acc ? acc[curr.asset] : 0) }
  }, {} as BalancesByAsset)

  console.log(balancesFromUtxos)
  if (Object.keys(balancesFromUtxos).length === 0) {
    const lbtcHash = lbtcAssetByNetwork(state.app.network);
    return { [lbtcHash]: 0 };
  };

  return balancesFromUtxos;
}