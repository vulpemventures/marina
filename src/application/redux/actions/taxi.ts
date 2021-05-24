import { AnyAction } from 'redux';
import { SET_TAXI_ASSETS, UPDATE_TAXI_ASSETS } from './action-types';

export function setTaxiAssets(newAssets: string[]): AnyAction {
  return {
    type: SET_TAXI_ASSETS,
    payload: newAssets,
  };
}

export function updateTaxiAssets(): AnyAction {
  return {
    type: UPDATE_TAXI_ASSETS,
  };
}
