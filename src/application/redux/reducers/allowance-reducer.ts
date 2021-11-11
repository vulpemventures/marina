import { Outpoint } from 'ldk';
import { AnyAction } from 'redux';
import { ALLOW_COIN } from '../actions/action-types';

export interface AllowanceState {
  allowed: Outpoint[];
}

export const allowanceInitState: AllowanceState = {
  allowed: [],
};

export function allowanceReducer(
  state: AllowanceState = allowanceInitState,
  { type, payload }: AnyAction
): AllowanceState {
  switch (type) {
    case ALLOW_COIN: {
      return {
        ...state,
        allowed: state.allowed.concat([{ txid: payload.txid, vout: payload.vout }]),
      };
    }

    default:
      return state;
  }
}
