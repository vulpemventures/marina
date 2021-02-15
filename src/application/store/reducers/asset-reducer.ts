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
      ticker: 'L-BTC',
    },
  },
  regtest: {},
};

export const assetReducer = (state: AssetsByNetwork, [type, payload]: [string, any]): any => {
  switch (type) {
    //
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS: {
      return payload.assets;
    }
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_INFOS_FAILURE: {
      return {
        ...state,
        errors: { assets: { message: payload.error.message } as IError },
      };
    }

    //
    /*
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_BALANCES_SUCCESS: {
      const liquidAssets = {
        ...state.liquid,
        quantity: 0,
      };
      const regtestAssets = {
        ...state.regtest,
        quantity: 0,
      };
      // TODO: WIP WIP WIP
      // state.regtest
      console.log('state.regtest', state.regtest);
      Object.entries(payload.balances).forEach((balance) => {
        Object.keys(state.regtest).forEach((k) => {
          //console.log('k', k);
          //console.log('balance[0]', balance[0]);
          //console.log('state.regtest', state.regtest);
          //console.log('balance[1]', balance[1]);
          if (balance[0] in state.regtest) {
            regtestAssets.quantity = balance[1] as number;
          }
        });
      });
      //console.log('regtestAssets', regtestAssets);

      // state.liquid
      //console.log('state.liquid', state.liquid);
      Object.entries(payload.balances).forEach((balance) => {
        Object.keys(state.liquid).forEach((k) => {
          //console.log('k', k);
          //console.log('balance[0]', balance[0]);
          //console.log('state.liquid', state.liquid);
          //console.log('balance[1]', balance[1]);
          if (balance[0] in state.liquid) {
            liquidAssets.quantity = balance[1] as number;
          }
        });
      });
      //console.log('liquidAssets', liquidAssets);
      return { liquidAssets, regtestAssets };
    }
    case ACTION_TYPES.ASSET_UPDATE_ALL_ASSET_BALANCES_FAILURE: {
      return {
        ...state,
        errors: { assets: { message: payload.error.message } as IError },
      };
    }
    */

    //
    default:
      return state;
  }
};
