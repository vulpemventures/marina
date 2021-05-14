import * as ACTION_TYPES from '../actions/action-types';
import { TxsHistoryByNetwork } from '../../../domain/transaction';
import { AnyAction } from 'redux';

const txsHistoryInitState: TxsHistoryByNetwork = { regtest: {}, liquid: {} };

export function txsHistoryReducer(state: TxsHistoryByNetwork = txsHistoryInitState, { type, payload }: AnyAction): TxsHistoryByNetwork {
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

    default:
      return state;
  }
};
