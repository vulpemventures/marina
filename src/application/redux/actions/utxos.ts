import { ThunkAction } from 'redux-thunk';
import { AddressInterface, fetchAndUnblindUtxos, isBlindedUtxo, UtxoInterface } from 'ldk';
import { explorerApiUrl, toStringOutpoint } from '../../utils';
import { WALLET_SET_UTXOS_FAILURE, WALLET_SET_UTXOS_SUCCESS } from './action-types';
import { AnyAction } from 'redux';
import { RootState } from '../store';

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

/**
 * Fetch and Set utxos to store and browser storage
 * @param addressesWithBlindingKeys
 * @param onSuccess
 * @param onError
 */
export function updateUtxos(
  addressesWithBlindingKeys: AddressInterface[],
  onSuccess?: () => void,
  onError?: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    const { app, wallets } = getState();
    const newMap = new Map(wallets[0].utxoMap);
    try {
      // Fetch utxo(s). Return blinded utxo(s) if unblinding has been skipped
      const fetchedUtxos = await fetchAndUnblindUtxos(
        addressesWithBlindingKeys,
        explorerApiUrl[app.network.value],
        // Skip fetch and unblind if utxo exists in React state
        (utxo) =>
          Array.from(wallets[0].utxoMap.keys()).some(
            (outpoint) => `${utxo.txid}:${utxo.vout}` === outpoint
          )
      );

      if (
        fetchedUtxos.every((u) => isBlindedUtxo(u)) &&
        fetchedUtxos.length === wallets[0].utxoMap.size
      )
        return onSuccess?.();
      // Add to newMap fetched utxo(s) not present in store
      fetchedUtxos.forEach((fetchedUtxo) => {
        const isPresent = Array.from(wallets[0].utxoMap.keys()).some(
          (storedUtxoOutpoint) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.set(toStringOutpoint(fetchedUtxo), fetchedUtxo);
      });
      // Delete from newMap utxo(s) not present in fetched utxos
      Array.from(newMap.keys()).forEach((storedUtxoOutpoint) => {
        const isPresent = fetchedUtxos.some(
          (fetchedUtxo) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.delete(storedUtxoOutpoint);
      });

      dispatch({ type: WALLET_SET_UTXOS_SUCCESS, payload: { utxoMap: newMap } });
      onSuccess?.();
    } catch (error) {
      dispatch({ type: WALLET_SET_UTXOS_FAILURE, payload: { error } });
      onError?.(error);
    }
  };
}
