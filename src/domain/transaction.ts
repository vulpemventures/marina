import { NetworkString, UnblindedOutput } from 'ldk';

export type UtxosAndTxsByNetwork = Record<NetworkString, UtxosAndTxs>;

export interface UtxosAndTxs {
  // outpoint string -> UnblindedOutput
  lockedUtxos: Record<string, UnblindedOutput>;
  utxosMap: Record<string, UnblindedOutput>;
  transactions: TxsHistory;
}

export type TxsHistory = Record<TxDisplayInterface['txId'], TxDisplayInterface>;

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

export function newEmptyUtxosAndTxsHistory(): UtxosAndTxsByNetwork {
  return {
    liquid: {
      utxosMap: {},
      transactions: {},
      lockedUtxos: {},
    },
    testnet: {
      utxosMap: {},
      transactions: {},
      lockedUtxos: {},
    },
    regtest: {
      utxosMap: {},
      transactions: {},
      lockedUtxos: {},
    },
  };
}
