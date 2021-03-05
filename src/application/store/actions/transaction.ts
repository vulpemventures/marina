import {
  PENDING_TX_SET_ASSET,
  PENDING_TX_FLUSH,
  PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
  PENDING_TX_SET_FEE_CHANGE_ADDRESS,
  PENDING_TX_SET_FEE_AMOUNT_AND_ASSET,
  PENDING_TX_SET_TAXI_TOPUP,
} from './action-types';
import { Action, IAppState, Thunk } from '../../../domain/common';
import { TopupWithAssetReply } from 'taxi-protobuf/generated/js/taxi_pb';
import { Address } from '../../../domain/wallet/value-objects';

export function setAsset(asset: string): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_SET_ASSET, { asset }]);
  };
}

export function setAddressesAndAmount(
  receipientAddress: Address,
  changeAddress: Address,
  amountInSatoshi: number
): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([
      PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
      { receipientAddress, changeAddress, amountInSatoshi },
    ]);
  };
}

export function setFeeChangeAddress(feeChangeAddress: Address): Thunk<IAppState, Action> {
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

export function setTopup(taxiTopup: TopupWithAssetReply.AsObject): Thunk<IAppState, Action> {
  return (dispatch) => {
    dispatch([PENDING_TX_SET_TAXI_TOPUP, { taxiTopup }]);
  };
}
