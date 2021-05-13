import axios from 'axios';
import { Assets, AssetsByNetwork } from '../../../domain/asset';
import { IAppState } from '../../../domain/common';
import {
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS,
} from './action-types';
import { explorerApiUrl } from '../../utils';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { ThunkAction } from 'redux-thunk';

/**
 * Update stored asset's info for all assets in wallet
 * @param onSuccess
 * @param onError
 */
export function updateAllAssetInfos(
  onSuccess?: (assetInfos: AssetsByNetwork) => void,
  onError?: (err: Error) => void
): ThunkAction<void, RootState, void, AnyAction> {
  return async (dispatch, getState) => {
    try {
      const { app, assets, wallets } = getState();
      const assetsFromUtxos: Assets = await Promise.all(
        [...wallets[0].utxoMap.values()].map(async ({ asset }) =>
          // If asset in store don't fetch
          !((asset as string) in assets[app.network.value])
            ? (await axios.get(`${explorerApiUrl[app.network.value]}/asset/${asset}`)).data
            : undefined
        )
      ).then((assetInfos) =>
        assetInfos
          .filter((a) => a !== undefined)
          .reduce(
            (acc, { asset_id, name, ticker, precision }) => ({
              ...acc,
              [asset_id]: { name, ticker, precision },
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
        dispatch({ type: ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS, payload: { assets: newAssets } });
        onSuccess?.(newAssets);
      } else {
        onSuccess?.(assets);
      }
    } catch (error) {
      onError?.(error);
    }
  };
}
