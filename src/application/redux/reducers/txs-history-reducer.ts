import * as ACTION_TYPES from '../actions/action-types';
import { TxDisplayInterface, TxsHistoryByNetwork } from '../../../domain/transaction';
import { AnyAction } from 'redux';

const txsHistoryInitState: TxsHistoryByNetwork = { regtest: {}, liquid: {} };

export function txsHistoryReducer(
  state: TxsHistoryByNetwork = txsHistoryInitState,
  { type, payload }: AnyAction
): TxsHistoryByNetwork {
  switch (type) {
    case ACTION_TYPES.ADD_TX: {
      let newLiquidTxsHistory = state.liquid;
      let newRegtestTxsHistory = state.regtest;
      const toAddTx = payload.tx as TxDisplayInterface;
      if (payload.network === 'liquid') {
        newLiquidTxsHistory = { ...state.liquid, [toAddTx.txId]: toAddTx };
      } else {
        newRegtestTxsHistory = { ...state.regtest, [toAddTx.txId]: toAddTx };
      }
      return { regtest: newRegtestTxsHistory, liquid: newLiquidTxsHistory };
    }

    default:
      return state;
  }
}
