import type { BlockHeader } from '../background/utils';
import type { GetHistoryResponse } from '../infrastructure/electrum-chain-source';

export interface ChainSource {
  subscribeScriptStatus(
    script: Buffer,
    callback: (scripthash: string, status: string | null) => void
  ): Promise<void>;
  unsubscribeScriptStatus(script: Buffer): Promise<void>;
  fetchHistories(scripts: Buffer[]): Promise<GetHistoryResponse[]>;
  fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]>;
  fetchBlockHeader(height: number): Promise<BlockHeader>;
  estimateFees(targetNumberBlocks: number): Promise<number>;
  broadcastTransaction(hex: string): Promise<string>;
  getRelayFee(): Promise<number>;
  close(): Promise<void>;
}
