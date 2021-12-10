import * as ACTION_TYPES from '../actions/action-types';
import { AnyAction } from 'redux';
import { Address } from '../../../domain/address';
import { UnblindedOutput } from 'ldk';

export type PendingTxStep = 'empty' | 'address-amount' | 'choose-fee' | 'confirmation';

export interface TransactionState {
  step: PendingTxStep;
  sendAsset: string;
  sendAmount: number;
  feeAmount: number;
  feeAsset: string;
  pset?: string;
  sendAddress?: Address;
  changeAddresses: Address[];
  selectedUtxos?: UnblindedOutput[];
}

export const transactionInitState: TransactionState = {
  step: 'empty',
  sendAsset: '',
  sendAddress: undefined,
  changeAddresses: [],
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
        step: 'address-amount',
        sendAsset: payload.asset,
      };
    }
    case ACTION_TYPES.PENDING_TX_SET_ADDRESSES_AND_AMOUNT: {
      return {
        ...state,
        step: 'choose-fee',
        sendAddress: payload.receipientAddress,
        changeAddresses: payload.changeAddresses,
        sendAmount: payload.amountInSatoshi,
      };
    }

    case ACTION_TYPES.PENDING_TX_SET_FEE_CHANGE_ADDRESS: {
      return {
        ...state,
        changeAddresses: [...state.changeAddresses, payload.feeChangeAddress],
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
        step: 'confirmation',
        pset: payload.pset,
        selectedUtxos: payload.utxos,
      };
    }

    default:
      return state;
  }
}
