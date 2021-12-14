import { NetworkString, TxInterface, UnblindedOutput } from 'ldk';

export interface UtxosAndTxsHistory {
  utxosMap: Record<string, UnblindedOutput>;
  transactions: TxsHistoryByNetwork;
}

export type TxsHistory = Record<TxInterface['txid'], TxInterface>;
export type TxsHistoryByNetwork = Record<NetworkString, TxsHistory>;

export enum TxType {
  SelfTransfer = 0,
  Deposit = 1,
  Withdraw = 2,
  Swap = 3,
  Unknow = 4,
}

export enum TxStatusEnum {
  Confirmed = 1,
  Pending = 0,
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
