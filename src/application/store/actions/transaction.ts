import {
  PENDING_TX_SET_ASSET,
  PENDING_TX_FLUSH,
  PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
  PENDING_TX_SET_FEE_CHANGE_ADDRESS,
  PENDING_TX_SET_FEE_AMOUNT_AND_ASSET,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';

export function setAsset(asset: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_SET_ASSET, { asset }]);
  };
}

export function setAddressesAndAmount(
  receipientAddress: string,
  changeAddress: string,
  amountInSatoshi: number
): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([
      PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
      { receipientAddress, changeAddress, amountInSatoshi },
    ]);
  };
}

export function setFeeChangeAddress(feeChangeAddress: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_SET_FEE_CHANGE_ADDRESS, { feeChangeAddress }]);
  };
}

export function setFeeAssetAndAmount(
  feeAsset: string,
  feeAmountInSatoshi: number
): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_SET_FEE_AMOUNT_AND_ASSET, { feeAsset, feeAmountInSatoshi }]);
  };
}

export function flush(): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_FLUSH]);
  };
}
