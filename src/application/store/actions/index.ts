import { Action, IAppState, Thunk } from '../../../domain/common';
import { getAllAssetBalances, updateAllAssetInfos } from './assets';
import { xpubWalletFromAddresses } from '../../utils';
import { setUtxos } from './utxos';

export * from './app';
export * from './assets';
export * from './transaction';
export * from './txs-history';
export * from './utxos';
export * from './wallet';

/**
 * Update utxos set, owned assets and balances
 * @param onSuccess
 * @param onError
 * @returns balances
 */
export function updateUtxosAssetsBalances(
  onSuccess?: (balances: { [p: string]: number }) => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState) => {
    const { app, assets, wallets } = getState();
    // Return early with empty balances if no addresses
    if (!wallets[0].confidentialAddresses.length) {
      return onSuccess?.(
        Object.keys(assets[app.network.value]).map((asset) => ({ [asset]: 0 }))[0]
      );
    }
    //
    const w = await xpubWalletFromAddresses(
      wallets[0].masterXPub.value,
      wallets[0].masterBlindingKey.value,
      wallets[0].confidentialAddresses,
      app.network.value
    );
    dispatch(
      updateAllAssetInfos(
        () => {
          dispatch(
            getAllAssetBalances(
              (balances) => onSuccess?.(balances),
              (error) => onError?.(error)
            )
          );
        },
        (error) => onError?.(error)
      )
    );
  };
}
