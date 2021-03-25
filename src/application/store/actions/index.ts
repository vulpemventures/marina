import { Action, IAppState, Thunk } from '../../../domain/common';
import { getAllAssetBalances, updateAllAssetInfos } from './assets';
import { xpubWalletFromAddresses } from '../../utils';
import { setUtxos, setUtxosFromStorage } from './utxos';

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
  fromNetwork = false,
  onSuccess?: (balances: { [p: string]: number }) => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action> {
  return async (dispatch, getState) => {
    const { app, assets, wallets } = getState();
    const [wallet] = wallets;

    // Return early with empty balances if no addresses
    if (!wallet.confidentialAddresses.length) {
      return onSuccess?.(
        Object.keys(assets[app.network.value]).map((asset) => ({ [asset]: 0 }))[0]
      );
    }

    const onInnerSuccess = () => {
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
    const onInnerError = (error: Error) => onError?.(error);

    let utxoSetter = () => setUtxosFromStorage(onInnerSuccess, onInnerError);
    if (fromNetwork) {
      const xpub = await xpubWalletFromAddresses(
        wallet.masterXPub.value,
        wallet.masterBlindingKey.value,
        wallet.confidentialAddresses,
        app.network.value
      );
      utxoSetter = () => setUtxos(xpub.getAddresses(), onInnerSuccess, onInnerError);
    }

    dispatch(utxoSetter());
  };
}
