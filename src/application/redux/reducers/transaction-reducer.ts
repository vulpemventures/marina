import * as ACTION_TYPES from '../actions/action-types';
import { AnyAction } from 'redux';
import { Address } from '../../../domain/address';

export interface TransactionState {
  sendAsset: string;
  sendAmount: number;
  feeAmount: number;
  feeAsset: string;
  pset?: string;
  sendAddress?: Address;
  changeAddress?: Address;
  feeChangeAddress?: Address;
}

const transactionInitState: TransactionState = {
  sendAsset: '',
  sendAddress: undefined,
  changeAddress: undefined,
  feeChangeAddress: undefined,
  sendAmount: 0,
  feeAmount: 0,
  feeAsset: '',
};

export function transactionReducer(
  state: TransactionState = transactionInitState,
  { type, payload }: AnyAction
): TransactionState {
  switch (type) {
    case ACTION_TYPES.PENDING_TX_SET_ASSET: {
      return {
        ...state,
        sendAsset: payload.asset,
        sendAddress: undefined,
        changeAddress: undefined,
        feeChangeAddress: undefined,
        sendAmount: 0,
        feeAmount: 0,
        feeAsset: '',
      };
    }
    case ACTION_TYPES.PENDING_TX_SET_ADDRESSES_AND_AMOUNT: {
      return {
        ...state,
        sendAddress: payload.receipientAddress,
        changeAddress: payload.changeAddress,
        sendAmount: payload.amountInSatoshi,
        feeChangeAddress: undefined,
        feeAmount: 0,
        feeAsset: '',
      };
    }

    case ACTION_TYPES.PENDING_TX_SET_FEE_CHANGE_ADDRESS: {
      return {
        ...state,
        feeChangeAddress: payload.feeChangeAddress,
      };
    }
    case ACTION_TYPES.PENDING_TX_SET_FEE_AMOUNT_AND_ASSET: {
      return {
        ...state,
        feeAmount: payload.feeAmountInSatoshi,
        feeAsset: payload.feeAsset,
      };
    }
    case ACTION_TYPES.PENDING_TX_FLUSH: {
      return transactionInitState;
    }

    case ACTION_TYPES.PENDING_TX_SET_PSET: {
      return {
        ...state,
        pset: payload.pset,
      };
    }

    default:
      return state;
  }
}
