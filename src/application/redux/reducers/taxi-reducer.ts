import { AnyAction } from 'redux';
import { SET_TAXI_ASSETS } from '../actions/action-types';
export interface TaxiState {
  taxiAssets: string[];
}

export const taxiInitState: TaxiState = {
  taxiAssets: [],
};

export function taxiReducer(
  state: TaxiState = taxiInitState,
  { type, payload }: AnyAction
): TaxiState {
  switch (type) {
    case SET_TAXI_ASSETS:
      return { ...state, taxiAssets: payload };

    default:
      return state;
  }
}
