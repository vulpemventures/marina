import { UtxoInterface } from 'ldk';

/**
 * Check that utxoMapStore and fetchedUtxos have the same set of utxos
 * @param utxoMapStore
 * @param fetchedUtxos
 * @returns boolean - true if utxo sets are equal, false if not
 */
export function compareUtxos(
  utxoMapStore: Map<string, UtxoInterface>,
  fetchedUtxos: UtxoInterface[]
) {
  if (utxoMapStore?.size !== fetchedUtxos?.length) return false;
  for (const outpoint of utxoMapStore.keys()) {
    // At least one outpoint in utxoMapStore is present in fetchedUtxos
    const isEqual = fetchedUtxos.some((utxo) => `${utxo.txid}:${utxo.vout}` === outpoint);
    if (!isEqual) return false;
  }
  return true;
}
