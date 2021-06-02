import { AnyAction } from 'redux';
import { IAssets } from '../../../domain/assets';
import * as ACTION_TYPES from '../actions/action-types';

const assetInitState: IAssets = {
  'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2': {
    name: 'Tether USD',
    precision: 8,
    ticker: 'USDt',
  },
  '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': {
    name: 'Liquid Bitcoin',
    precision: 8,
    ticker: 'L-BTC',
  },
  '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
    name: 'Liquid Bitcoin',
    precision: 8,
    ticker: 'L-BTC',
  },
  'e73d75039ba1372d7726b92463fe0f18dadc3d4586faa6a76457f922153e1890': {
    name: 'Moloch\'s Hammer',
    ticker: 'MMoHa',
    precision: 0,
  },
  'ea79766f9ac8fec6bc484b8f081af5b7bb2f87576e6e2918819ae6d98048a94d': {
    name: 'Blockstream Sticker Token',
    precision: 0,
    ticker: 'B-STK',
  }
};

export function assetReducer(
  state: IAssets = assetInitState,
  { type, payload }: AnyAction
): IAssets {
  switch (type) {
    case ACTION_TYPES.ADD_ASSET: {
      return {
        ...state,
        [payload.assetHash]: payload.asset
      }
    }
    default:
      return state;
  }
}
