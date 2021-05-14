import { lbtcAssetByNetwork } from "../../utils";
import { RootState } from "../store";

export type BalancesByAsset = { [assetHash: string]: number };

/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function balances(state: RootState): BalancesByAsset {
  const utxos = state.wallets[0].utxoMap.values();
  const balances = Array.from(utxos).reduce((acc, curr) => {
    if (!curr.asset || !curr.value) {
      return acc;
    }
    return { ...acc, [curr.asset]: curr.value + (curr.asset in acc ? acc[curr.asset] : 0) }
  }, {} as BalancesByAsset)

  if (Object.keys(balances).length === 0) {
    const lbtcHash = lbtcAssetByNetwork(state.app.network.value);
    return { [lbtcHash]: 0 };
  };

  return balances;
}