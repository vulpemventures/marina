import axios from 'axios';
import { Assets, AssetsByNetwork } from '../../../domain/asset';
import { Thunk, IAppState, Action } from '../../../domain/common';
import {
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS,
  ASSET_UPDATE_ALL_ASSET_INFOS_FAILURE,
  INIT_ASSETS,
  ASSET_GET_ALL_ASSET_BALANCES_FAILURE,
  ASSET_GET_ALL_ASSET_BALANCES_SUCCESS,
} from './action-types';
import { lbtcAssetByNetwork } from '../../../presentation/utils';

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
export function getAllAssetBalances(
  onSuccess: (balances: { [assetHash: string]: number }) => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return (dispatch, getState) => {
    const { wallets } = getState();
    const balances = Array.from(wallets[0].utxoMap.values()).reduce((acc, curr) => {
      if (!curr.asset || !curr.value) {
        dispatch([ASSET_GET_ALL_ASSET_BALANCES_FAILURE]);
        onError(new Error(`Missing utxo info. Asset: ${curr.asset}, Value: ${curr.value}`));
        return acc;
      }
      let value = curr.value;
      if (curr.asset in acc) {
        // If multiple utxos of the same asset then add their values
        value = acc[curr.asset] + curr.value;
      }
      acc = { ...acc, [curr.asset]: value };
      return acc;
    }, {} as { [assetHash: string]: number });
    // Dispatch event simply for debugging. No balance state is kept outside utxos
    dispatch([ASSET_GET_ALL_ASSET_BALANCES_SUCCESS]);
    onSuccess(balances);
  };
}

/**
 * Get L-BTC balance
 * @param onSuccess
 * @param onError
 */
export function getLiquidBitcoinBalance(
  onSuccess: (balance: number) => void,
  onError: (err: Error) => void
): Thunk<IAppState, Action> {
  return (dispatch, getState) => {
    const { app, wallets } = getState();
    const balance =
      [...wallets[0].utxoMap.values()].find(
        (utxo) => utxo.asset === lbtcAssetByNetwork(app.network.value)
      )?.value ?? 0;
    if (balance) {
      onSuccess(balance / Math.pow(10, 8));
    } else {
      onError(new Error('Cannot fetch L-BTC balance'));
    }
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

      const explorerURL = app.network.value === `liquid` ? `https://blockstream.info/liquid/api` : `http://localhost:3001`
      const assetsFromUtxos: Assets = await Promise.all(
        [...wallets[0].utxoMap.values()].map(async ({ asset, value }) =>
          // If asset in store don't fetch
          !((asset as string) in assets[app.network.value])
            ? (await axios.get(`${explorerURL}/asset/${asset}`)).data
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
