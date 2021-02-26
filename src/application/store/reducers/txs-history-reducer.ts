import * as ACTION_TYPES from '../actions/action-types';
import { IError } from '../../../domain/common';
import { TxsHistory, TxsHistoryByNetwork } from '../../../domain/transaction';

export const txsHistoryInitState: TxsHistoryByNetwork = { regtest: {}, liquid: {} };

export const txsHistoryReducer = (state: TxsHistory, [type, payload]: [string, any]): any => {
  switch (type) {
    case ACTION_TYPES.INIT_TXS_HISTORY: {
      return {
        ...state,
        ...payload,
      };
    }

    case ACTION_TYPES.TXS_HISTORY_SET_TXS_SUCCESS: {
      let newLiquidTxsHistory = state.liquid;
      let newRegtestTxsHistory = state.regtest;
      if (payload.network === 'liquid') {
        newLiquidTxsHistory = { ...state.liquid, ...payload.txs };
      } else {
        newRegtestTxsHistory = { ...state.regtest, ...payload.txs };
      }
      return { regtest: newRegtestTxsHistory, liquid: newLiquidTxsHistory };
    }

    case ACTION_TYPES.TXS_HISTORY_UPDATE_FAILURE: {
      return {
        ...state,
        errors: { txsHistory: { message: payload.error.message } as IError },
      };
    }

    //
    default:
      return state;
  }
};
