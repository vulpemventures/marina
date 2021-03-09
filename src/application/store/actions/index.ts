import { Action, IAppState, Thunk } from '../../../domain/common';
import { getAllAssetBalances, updateAllAssetInfos } from './assets';
import { xpubWalletFromAddresses } from '../../utils';
import { setUtxos } from './wallet';

export * from './app';
export * from './assets';
export * from './transaction';
export * from './txs-history';
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
    const { app, wallets } = getState();
    const w = await xpubWalletFromAddresses(
      wallets[0].masterXPub.value,
      wallets[0].masterBlindingKey.value,
      wallets[0].confidentialAddresses,
      app.network.value
    );
    dispatch(
      setUtxos(
        w.getAddresses(),
        () => {
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
        },
        (error: Error) => onError?.(error)
      )
    );
  };
}
