import * as ACTION_TYPES from '../actions/action-types';
import { TxDisplayInterface, TxsHistoryByNetwork } from '../../../domain/transaction';
import { AnyAction } from 'redux';
import { NetworkString } from 'ldk';

export const txsHistoryInitState: TxsHistoryByNetwork = { regtest: {}, liquid: {}, testnet: {} };

export function txsHistoryReducer(
  state: TxsHistoryByNetwork = txsHistoryInitState,
  { type, payload }: AnyAction
): TxsHistoryByNetwork {
  switch (type) {
    case ACTION_TYPES.RESET_TXS: {
      return txsHistoryInitState;
    }

    case ACTION_TYPES.ADD_TX: {
      const toAddTx = payload.tx as TxDisplayInterface;
      const net = payload.network as NetworkString;
      return { ...state, [net]: { ...state[net], [toAddTx.txId]: toAddTx } };
    }

    default:
      return state;
  }
}
