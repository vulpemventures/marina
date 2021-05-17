import { address, TxInterface, decodePset } from 'ldk';
import { Address } from './address';
import { IError } from './common';
import { Network } from './network';

export type TxsHistory = Record<TxInterface['txid'], TxInterface>;

export type TxsHistoryByNetwork = Record<Network, TxsHistory> &
  Partial<Record<'errors', IError>>;

export type TxType = 'receive' | 'send';

export type TxStatus = 'confirmed' | 'pending';

export interface TxDisplayInterface {
  address: string;
  amount: number;
  asset: string;
  blockTime: number;
  date: string;
  dateContracted: string;
  fee: number;
  feeAsset: string;
  status: TxStatus;
  txId: string;
  toSelf: boolean;
  type: TxType;
  unblindURL?: string;
}

export interface TxsByAssetsInterface {
  [asset: string]: Array<TxDisplayInterface>;
}

export interface TxsByTxIdInterface {
  [txid: string]: TxDisplayInterface;
}

export interface OutputBlinders {
  asset: string;
  value: number;
  assetBlinder: string;
  valueBlinder: string;
}

export interface Transaction {
  pset: string;
  sendAddress: string;
  sendAsset: string;
  sendAmount: number;
  feeAsset: string;
  feeAmount: number;
  changeAddress?: Address;
}

export interface TransactionDTO {
  value: string;
  sendAddress: string;
  sendAsset: string;
  sendAmount: number;
  feeAsset: string;
  feeAmount: number;
  changeAddress?: [address: string, derivationPath?: string];
}

function isValidTx(tx: string): boolean {
  try {
    decodePset(tx);
    return true;
  } catch (ignore) {
    return false;
  }
}

function isValidAddress(addr: string): boolean {
  try {
    address.toOutputScript(addr);
    return true;
  } catch (ignore) {
    return false;
  }
}

function isValidAsset(asset: string): boolean {
  return asset.length === 64;
}

function isValidAmount(amount: number): boolean {
  return amount > 0 && amount <= 2100000000000000;
}

export function createTransaction(props: Transaction): Transaction {
  if (
    !isValidTx(props.pset) ||
    !isValidAddress(props.sendAddress) ||
    !isValidAsset(props.sendAsset) ||
    !isValidAmount(props.sendAmount) ||
    !isValidAsset(props.feeAsset) ||
    !isValidAmount(props.feeAmount)
  ) {
    throw new Error('Transaction must be a valid base64 encoded PSET');
  } else if (props.changeAddress && !isValidAddress(props.changeAddress.value)) {
    throw new Error('Transaction must be a valid base64 encoded PSET');
  } else {
    return props
  }
}
