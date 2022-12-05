import {
  PENDING_TX_SET_ASSET,
  PENDING_TX_FLUSH,
  PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
  PENDING_TX_SET_FEE_CHANGE_ADDRESS,
  PENDING_TX_SET_FEE_AMOUNT_AND_ASSET,
  PENDING_TX_SET_PSET,
  PENDING_TX_SET_STEP,
  ADD_TX,
  ADD_SCRIPT_HASH,
  CONFIRM_TX,
} from './action-types';
import type { AnyAction } from 'redux';
import type { Address } from '../../../domain/address';
import type { NetworkString, UnblindedOutput, TxInterface } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';
import type { PendingTxStep } from '../reducers/transaction-reducer';

export type AddTxAction = ActionWithPayload<{
  tx: TxInterface;
  network: NetworkString;
  accountID: AccountID;
}>;

export function setAsset(asset: string): AnyAction {
  return { type: PENDING_TX_SET_ASSET, payload: { asset } };
}

export function setPendingTxStep(step: PendingTxStep): AnyAction {
  return { type: PENDING_TX_SET_STEP, payload: { step } };
}

export function setAddressesAndAmount(
  amountInSatoshi: number,
  changeAddresses?: Address[],
  recipientAddress?: Address
): AnyAction {
  return {
    type: PENDING_TX_SET_ADDRESSES_AND_AMOUNT,
    payload: { recipientAddress, changeAddresses, amountInSatoshi },
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

export function addTx(accountID: AccountID, tx: TxInterface, network: NetworkString): AnyAction {
  return {
    type: ADD_TX,
    payload: { tx, network, accountID },
  };
}

export function addScriptHash(
  accountID: AccountID,
  scriptHash: string,
  network: NetworkString
): AnyAction {
  return {
    type: ADD_SCRIPT_HASH,
    payload: { scriptHash, accountID, network },
  };
}

export function confirmTx(txID: string, blocktime: number, network: NetworkString): AnyAction {
  return {
    type: CONFIRM_TX,
    payload: { txID, blocktime, network },
  };
}
