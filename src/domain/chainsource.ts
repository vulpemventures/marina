import type { Utxo } from 'marina-provider';

export type TransactionHistory = Array<{
  tx_hash: string;
  height: number;
}>;

export interface BlockHeader {
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  timestamp: number;
  height: number;
}

export type Unspent = Omit<Utxo, 'scriptDetails'>;

export interface ChainSource {
  subscribeScriptStatus(
    script: Buffer,
    callback: (scripthash: string, status: string | null) => void
  ): Promise<void>;
  unsubscribeScriptStatus(script: Buffer): Promise<void>;
  fetchHistories(scripts: Buffer[]): Promise<TransactionHistory[]>;
  fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]>;
  fetchBlockHeaders(heights: number[]): Promise<BlockHeader[]>;
  estimateFees(targetNumberBlocks: number): Promise<number>;
  broadcastTransaction(hex: string): Promise<string>;
  getRelayFee(): Promise<number>;
  close(): Promise<void>;
  waitForAddressReceivesTx(addr: string): Promise<void>;
  listUnspents(addr: string): Promise<Unspent[]>;
}
