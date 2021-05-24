import { AnyAction } from 'redux';
import { SET_TAXI_ASSETS } from '../actions/action-types';
export interface TaxiState {
  taxiAssets: string[];
}

const initState: TaxiState = {
  taxiAssets: [],
};

export function taxiReducer(state: TaxiState = initState, { type, payload }: AnyAction): TaxiState {
  switch (type) {
    case SET_TAXI_ASSETS:
      return { ...state, taxiAssets: payload };

    default:
      return state;
  }
}
