import axios from 'axios';
import { Assets, AssetsByNetwork } from '../../../domain/asset';
import { Thunk, IAppState, Action } from '../../../domain/common';
import {
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS,
  ASSET_UPDATE_ALL_ASSET_INFOS_FAILURE,
  INIT_ASSETS,
  ASSET_UPDATE_ALL_ASSET_BALANCES_FAILURE,
  ASSET_UPDATE_ALL_ASSET_BALANCES_SUCCESS,
} from './action-types';

export function initAssets(assets: AssetsByNetwork): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([INIT_ASSETS, { ...assets }]);
  };
}

/**
 * Extract balances from all unblinded utxos in state
 * @param onSuccess
 * @param onError
 */
export function updateAllAssetBalances(
  onSuccess: (balances: { [assetHash: string]: number }) => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return (dispatch, getState) => {
    const { wallets } = getState();
    const balances = Array.from(wallets[0].utxoMap.values()).reduce((acc, curr) => {
      if (!curr.asset || !curr.value) {
        dispatch([ASSET_UPDATE_ALL_ASSET_BALANCES_FAILURE]);
        onError(new Error(`Missing utxo info. Asset: ${curr.asset}, Value: ${curr.value}`));
        return acc;
      }
      acc = { ...acc, [curr.asset]: curr.value };
      return acc;
    }, {} as { [assetHash: string]: number });
    dispatch([ASSET_UPDATE_ALL_ASSET_BALANCES_SUCCESS, { balances }]);
    onSuccess(balances);
  };
}

/**
 * Update stored asset's info for all assets in wallet
 * @param onSuccess
 * @param onError
 */
export function updateAllAssetInfos(
  onSuccess?: (assetInfos: AssetsByNetwork) => void,
  onError?: (err: Error) => void
): Thunk<IAppState, Action<AssetsByNetwork>> {
  return async (dispatch, getState, repos) => {
    try {
      const { app, assets, wallets } = getState();
      const assetsFromUtxos: Assets = await Promise.all(
        [...wallets[0].utxoMap.values()].map(async ({ asset, value }) =>
          // If asset in store don't fetch
          !((asset as string) in assets[app.network.value])
            ? { ...(await axios.get(`http://localhost:3001/asset/${asset}`)).data, quantity: value }
            : undefined
        )
      ).then((assetInfos) =>
        assetInfos
          .filter((a) => a !== undefined)
          .reduce(
            (acc, { asset_id, name, ticker, precision, quantity }) => ({
              ...acc,
              [asset_id]: { name, ticker, precision, quantity },
            }),
            {} as Assets
          )
      );
      // Update stores
      if (Object.keys(assetsFromUtxos).length) {
        let assetInfosLiquid = assets.liquid;
        let assetInfosRegtest = assets.regtest;
        if (app.network.value === 'liquid') {
          assetInfosLiquid = { ...assets.liquid, ...assetsFromUtxos };
        } else {
          assetInfosRegtest = { ...assets.regtest, ...assetsFromUtxos };
        }
        const newAssets: AssetsByNetwork = { liquid: assetInfosLiquid, regtest: assetInfosRegtest };
        await repos.assets.updateAssets(() => newAssets);
        dispatch([ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS, { assets: newAssets }]);
        onSuccess?.(newAssets);
      } else {
        onSuccess?.(assets);
      }
    } catch (error) {
      dispatch([ASSET_UPDATE_ALL_ASSET_INFOS_FAILURE, { error }]);
      onError?.(error);
    }
  };
}
