import { TxInterface } from 'ldk';
import { Network } from '../app/value-objects';
import { IError } from '../common';

export type TxsHistory = Record<TxInterface['txid'], TxInterface>;

export type TxsHistoryByNetwork = Record<Network['value'], TxsHistory> &
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
  blinders: OutputBlinders[];
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
