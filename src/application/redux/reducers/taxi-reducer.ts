import { NetworkString } from 'ldk';
import { AnyAction } from 'redux';
import { RESET_TAXI, SET_TAXI_ASSETS } from '../actions/action-types';

export interface TaxiState {
  taxiAssets: Record<NetworkString, string[]>;
}

export const taxiInitState: TaxiState = {
  taxiAssets: {
    'liquid': [],
    'testnet': [],
    'regtest': [],
  }
};

export function taxiReducer(
  state: TaxiState = taxiInitState,
  { type, payload }: AnyAction
): TaxiState {
  switch (type) {
    case RESET_TAXI: {
      return taxiInitState;
    }

    case SET_TAXI_ASSETS:
      return { ...state, taxiAssets: {
        ...state.taxiAssets,
        [payload.network]: payload.assets,
      } };

    default:
      return state;
  }
}
