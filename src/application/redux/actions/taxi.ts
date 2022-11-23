import type { NetworkString } from 'ldk';
import type { AnyAction } from 'redux';
import { SET_TAXI_ASSETS } from './action-types';

export function setTaxiAssets(network: NetworkString, newAssets: string[]): AnyAction {
  return {
    type: SET_TAXI_ASSETS,
    payload: { network, assets: newAssets },
  };
}
