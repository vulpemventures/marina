import type { AnyAction } from 'redux';
import type { Asset } from '../../../domain/assets';
import { ADD_ASSET } from './action-types';

export function addAsset(assetHash: string, asset: Asset): AnyAction {
  return {
    type: ADD_ASSET,
    payload: { assetHash, asset },
  };
}
