import { crypto } from 'liquidjs-lib';
import type { BlockHeader } from '../background/utils';
import { deserializeBlockHeader } from '../background/utils';
import type { ElectrumWS } from './ws/ws-electrs';

export interface ChainSource {
  subscribeScriptStatus(
    script: Buffer,
    callback: (scripthash: string, status: string | null) => void
  ): Promise<void>;
  unsubscribeScriptStatus(script: Buffer): Promise<void>;
  fetchHistories(scripts: Buffer[]): Promise<GetHistoryResponse[]>;
  fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]>;
  fetchUnspentOutputs(scripts: Buffer[]): Promise<ListUnspentResponse[]>;
  fetchBlockHeader(height: number): Promise<BlockHeader>;
  estimateFees(targetNumberBlocks: number): Promise<number>;
  broadcastTransaction(hex: string): Promise<string>;
}

export type GetHistoryResponse = Array<{
  tx_hash: string;
  height: number;
}>;

export type ListUnspentResponse = Array<{
  tx_hash: string;
  tx_pos: number;
  height: number; // if 0 = unconfirmed
}>;

const BroadcastTransaction = 'blockchain.transaction.broadcast'; // returns txid
const EstimateFee = 'blockchain.estimatefee'; // returns fee rate in sats/kBytes
const GetBlockHeader = 'blockchain.block.header'; // returns block header as hex string
const GetHistoryMethod = 'blockchain.scripthash.get_history';
const GetTransactionMethod = 'blockchain.transaction.get'; // returns hex string
const ListUnspentMethod = 'blockchain.scripthash.listunspent'; // returns array of Outpoint
const SubscribeStatusMethod = 'blockchain.scripthash'; // ElectrumWS automatically adds '.subscribe'

export class WsElectrumChainSource implements ChainSource {
  constructor(private ws: ElectrumWS) {}

  async fetchUnspentOutputs(scripts: Buffer[]): Promise<ListUnspentResponse[]> {
    const scriptsHashes = scripts.map(toScriptHash);
    const resp = await this.ws.batchRequest<ListUnspentResponse[]>(
      ...scriptsHashes.map((s) => ({ method: ListUnspentMethod, params: [s] }))
    );
    return resp;
  }

  async fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]> {
    const responses = await this.ws.batchRequest<string[]>(
      ...txids.map((txid) => ({ method: GetTransactionMethod, params: [txid] }))
    );
    return responses.map((hex, i) => ({ txID: txids[i], hex }));
  }

  async unsubscribeScriptStatus(script: Buffer): Promise<void> {
    await this.ws.unsubscribe(SubscribeStatusMethod, toScriptHash(script)).catch();
  }

  async subscribeScriptStatus(
    script: Buffer,
    callback: (scripthash: string, status: string | null) => void
  ) {
    const scriptHash = toScriptHash(script);
    await this.ws.subscribe(SubscribeStatusMethod, callback, scriptHash);
  }

  async fetchHistories(scripts: Buffer[]): Promise<GetHistoryResponse[]> {
    const scriptsHashes = scripts.map((s) => toScriptHash(s));
    const responses = await this.ws.batchRequest<GetHistoryResponse[]>(
      ...scriptsHashes.map((s) => ({ method: GetHistoryMethod, params: [s] }))
    );
    return responses;
  }

  async fetchBlockHeader(height: number): Promise<BlockHeader> {
    const hex = await this.ws.request<string>(GetBlockHeader, height);
    return deserializeBlockHeader(hex);
  }

  async estimateFees(targetNumberBlocks: number): Promise<number> {
    const feeRate = await this.ws.request<number>(EstimateFee, targetNumberBlocks);
    return feeRate;
  }

  async broadcastTransaction(hex: string): Promise<string> {
    return this.ws.request<string>(BroadcastTransaction, hex);
  }
}

function toScriptHash(script: Buffer): string {
  return crypto.sha256(script).reverse().toString('hex');
}
