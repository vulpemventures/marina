import { AssetsByNetwork } from '../../../domain/asset';
import { IError } from '../../../domain/common';
import * as ACTION_TYPES from '../actions/action-types';

export const assetInitState: AssetsByNetwork = {
  liquid: {
    ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2: {
      name: 'Tether USD',
      precision: 8,
      ticker: 'USDt',
    },
    '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
      name: 'Liquid Bitcoin',
      precision: 8,
      ticker: 'L-BTC',
    },
  },
  regtest: {
    '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
      name: 'Liquid Bitcoin',
      precision: 8,
      ticker: 'L-BTC',
    },
  },
};

export const assetReducer = (state: AssetsByNetwork, [type, payload]: [string, any]): any => {
  switch (type) {
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS: {
      return payload.assets;
    }
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_INFOS_FAILURE: {
      return {
        ...state,
        errors: { assets: { message: payload.error.message } as IError },
      };
    }

    default:
      return state;
  }
};
