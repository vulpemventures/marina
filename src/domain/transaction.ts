import { address, decodePset } from 'ldk';
import { Address } from './address';
import { IError } from './common';
import { Network } from './network';

export type TxsHistory = Record<TxDisplayInterface['txId'], TxDisplayInterface>;

export type TxsHistoryByNetwork = Record<Network, TxsHistory> & Partial<Record<'errors', IError>>;

export enum TxType {
  SelfTransfer = 0,
  Deposit = 1,
  Withdraw = 2,
  Swap = 3,
  Unknow = 4
}

export enum TxStatusEnum {
  Confirmed = 1,
  Pending = 0
}

export interface Transfer {
  asset: string;
  // amount > 0 = received & amount < 0 = sent
  amount: number;
}

export interface TxDisplayInterface {
  type: TxType;
  fee: number;
  txId: string;
  status: TxStatusEnum;
  transfers: Transfer[];
  webExplorersBlinders: string; // will be concat with webExplorerURL
  blockTimeMs?: number;
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
    return props;
  }
}
