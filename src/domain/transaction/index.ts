import { TxInterface } from 'ldk';
import { Network } from '../app/value-objects';

export type TxsHistory = Record<TxInterface['txid'], TxInterface>;

export type TxsHistoryByNetwork = Record<Network['value'], TxsHistory>;

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
}

export interface TxsByAssetsInterface {
  [asset: string]: Array<TxDisplayInterface>;
}

export interface TxsByTxIdInterface {
  [txid: string]: TxDisplayInterface;
}
