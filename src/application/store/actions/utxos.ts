import { AddressInterface, fetchAndUnblindUtxos, isBlindedUtxo, UtxoInterface } from 'ldk';
import { Action, IAppState, Thunk } from '../../../domain/common';
import { explorerApiUrl, toStringOutpoint } from '../../utils';
import { WALLET_SET_UTXOS_FAILURE, WALLET_SET_UTXOS_SUCCESS } from './action-types';

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
 * Set utxos to store and browser storage
 * @param addressesWithBlindingKeys
 * @param onSuccess
 * @param onError
 */
export function setUtxos(
  addressesWithBlindingKeys: AddressInterface[],
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
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
      console.log(newMap)
      await repos.wallet.setUtxos(newMap);
      dispatch([WALLET_SET_UTXOS_SUCCESS, { utxoMap: newMap }]);
      onSuccess?.();
    } catch (error) {
      dispatch([WALLET_SET_UTXOS_FAILURE, { error }]);
      onError?.(error);
    }
  };
}


/**
 * Set utxos to store from browser storage
 * @param onSuccess
 * @param onError
 */
export function setUtxosFromStorage(
  onSuccess?: () => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState, repos) => {
    const { wallets } = getState();
    const newMap = new Map(wallets[0].utxoMap);
    try {
      // get utxos from repo
      const utxoMapFromRepo = await repos.wallet.getUtxos();
      if (
        utxoMapFromRepo.size === wallets[0].utxoMap.size
      ) {
        return onSuccess?.();

      }
      // Add to newMap fetched utxo(s) from repo not present in store
      utxoMapFromRepo.forEach((fetchedUtxo: UtxoInterface) => {
        const isPresent = Array.from(wallets[0].utxoMap.keys()).some(
          (storedUtxoOutpoint) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.set(toStringOutpoint(fetchedUtxo), fetchedUtxo);
      });
      // Delete from newMap utxo(s) not present in fetched utxos
      Array.from(newMap.keys()).forEach((storedUtxoOutpoint) => {
        const isPresent = Array.from(utxoMapFromRepo).some(
          ([_, fetchedUtxo]) => storedUtxoOutpoint === toStringOutpoint(fetchedUtxo)
        );
        if (!isPresent) newMap.delete(storedUtxoOutpoint);
      });

      dispatch([WALLET_SET_UTXOS_SUCCESS, { utxoMap: newMap }]);
      onSuccess?.();
    } catch (error) {
      dispatch([WALLET_SET_UTXOS_FAILURE, { error }]);
      onError?.(error);
    }
  };
}
