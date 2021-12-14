import {
  PENDING_TX_SET_ASSET,
  PENDING_TX_FLUSH,
  PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
  PENDING_TX_SET_FEE_CHANGE_ADDRESS,
  PENDING_TX_SET_FEE_AMOUNT_AND_ASSET,
  PENDING_TX_SET_PSET,
  ADD_TX,
} from './action-types';
import { AnyAction } from 'redux';
import { Address } from '../../../domain/address';
import { NetworkString, UnblindedOutput, TxInterface } from 'ldk';
import { AccountID } from '../../../domain/account';
import { ActionWithPayload } from '../../../domain/common';

export type AddTxAction = ActionWithPayload<{
  tx: TxInterface;
  network: NetworkString;
  accountID: AccountID;
}>;

export function setAsset(asset: string): AnyAction {
  return { type: PENDING_TX_SET_ASSET, payload: { asset } };
}

export function setAddressesAndAmount(
  receipientAddress: Address,
  changeAddresses: Address[],
  amountInSatoshi: number
): AnyAction {
  return {
    type: PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
    payload: { receipientAddress, changeAddresses, amountInSatoshi },
  };
}

export function setFeeChangeAddress(feeChangeAddress: Address): AnyAction {
  return { type: PENDING_TX_SET_FEE_CHANGE_ADDRESS, payload: { feeChangeAddress } };
}

export function setFeeAssetAndAmount(feeAsset: string, feeAmountInSatoshi: number): AnyAction {
  return { type: PENDING_TX_SET_FEE_AMOUNT_AND_ASSET, payload: { feeAsset, feeAmountInSatoshi } };
}

export function flushPendingTx(): AnyAction {
  return { type: PENDING_TX_FLUSH };
}

export function setPset(pset: string, utxos: UnblindedOutput[]): AnyAction {
  return {
    type: PENDING_TX_SET_PSET,
    payload: { pset, utxos },
  };
}

export function addTx(accountID: AccountID, tx: TxInterface, network: NetworkString): AddTxAction {
  return {
    type: ADD_TX,
    payload: { tx, network, accountID },
  };
}
