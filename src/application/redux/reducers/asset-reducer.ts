import { networks } from 'ldk';
import { AnyAction } from 'redux';
import { Asset, IAssets } from '../../../domain/assets';
import * as ACTION_TYPES from '../actions/action-types';

const USDt: Asset = {
  name: 'Tether USD',
  precision: 8,
  ticker: 'USDt',
};

const LBTC: Asset = {
  name: 'Liquid Bitcoin',
  precision: 8,
  ticker: 'L-BTC',
};

export const assetInitState: IAssets = {
  ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: USDt,
  f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958: USDt,
  [networks.liquid.assetHash]: LBTC,
  [networks.regtest.assetHash]: LBTC,
  [networks.testnet.assetHash]: LBTC,
};

export function assetReducer(
  state: IAssets = assetInitState,
  { type, payload }: AnyAction
): IAssets {
  switch (type) {
    case ACTION_TYPES.ADD_ASSET: {
      return {
        ...state,
        [payload.assetHash]: payload.asset,
      };
    }
    default:
      return state;
  }
}
