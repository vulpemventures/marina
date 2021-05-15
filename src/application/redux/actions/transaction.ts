import { ThunkAction } from 'redux-thunk';
import { browser } from 'webextension-polyfill-ts';
import {
  PENDING_TX_SET_ASSET,
  PENDING_TX_FLUSH,
  PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
  PENDING_TX_SET_FEE_CHANGE_ADDRESS,
  PENDING_TX_SET_FEE_AMOUNT_AND_ASSET,
  PENDING_TX_SET_TAXI_TOPUP,
} from './action-types';
import { TopupWithAssetReply } from 'taxi-protobuf/generated/js/taxi_pb';
import { Address } from '../../../domain/wallet/value-objects';
import { unsetPendingTx } from './wallet';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { ProxyStoreDispatch } from '../../../presentation';

export function setAsset(asset: string): AnyAction {
  return { type: PENDING_TX_SET_ASSET, payload: { asset } };
}

export function setAddressesAndAmount(
  receipientAddress: Address,
  changeAddress: Address,
  amountInSatoshi: number
): AnyAction {
  return {
    type: PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
    payload: { receipientAddress, changeAddress, amountInSatoshi },
  };
}

export function setFeeChangeAddress(feeChangeAddress: Address): AnyAction {
  return { type: PENDING_TX_SET_FEE_CHANGE_ADDRESS, payload: { feeChangeAddress } };
}

export function setFeeAssetAndAmount(
  feeAsset: string,
  feeAmountInSatoshi: number
): AnyAction {
  return { type: PENDING_TX_SET_FEE_AMOUNT_AND_ASSET, payload: { feeAsset, feeAmountInSatoshi } };
}

function flushPendingTx(): AnyAction {
  return ({ type: PENDING_TX_FLUSH });
}

export function setTopup(
  taxiTopup: TopupWithAssetReply.AsObject | Record<string, never>
): AnyAction {
  return ({ type: PENDING_TX_SET_TAXI_TOPUP, payload: { taxiTopup } });
}

/**
 * Flush both 'wallets[0].pendingTx' and 'transaction' state
 * Unset badge
 */
export async function flushTx(
  dispatch: ProxyStoreDispatch
) {
  await dispatch(unsetPendingTx());
  await dispatch(flushPendingTx());
  browser.browserAction.setBadgeText({ text: '' }).catch(() => ({}));
}
