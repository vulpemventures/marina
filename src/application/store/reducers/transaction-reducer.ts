import * as ACTION_TYPES from '../actions/action-types';

export interface TransactionState {
  asset: string;
  receipientAddress: string;
  changeAddress: string;
  feeChangeAddress: string;
  amountInSatoshi: number;
  feeAmountInSatoshi: number;
  feeAsset: string;
}

export const transactionInitState: TransactionState = {
  asset: '',
  receipientAddress: '',
  changeAddress: '',
  feeChangeAddress: '',
  amountInSatoshi: 0,
  feeAmountInSatoshi: 0,
  feeAsset: '',
};

export const transactionReducer = (
  state: TransactionState,
  [type, payload]: [string, any]
): any => {
  switch (type) {
    case ACTION_TYPES.PENDING_TX_SET_ASSET: {
      return {
        ...state,
        asset: payload.asset,
        receipientAddress: '',
        changeAddress: '',
        feeChangeAddress: '',
        amountInSatoshi: 0,
        feeAmountInSatoshi: 0,
        feeAsset: '',
      };
    }
    case ACTION_TYPES.PENDING_TX_SET_ADDRESSES_AND_AMOUNT: {
      return {
        ...state,
        receipientAddress: payload.receipientAddress,
        changeAddress: payload.changeAddress,
        amountInSatoshi: payload.amountInSatoshi,
        feeChangeAddress: '',
        feeAmountInSatoshi: 0,
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
        feeAmountInSatoshi: payload.feeAmountInSatoshi,
        feeAsset: payload.feeAsset,
      };
    }
    case ACTION_TYPES.PENDING_TX_FLUSH: {
      return transactionInitState;
    }
    default:
      return state;
  }
};
