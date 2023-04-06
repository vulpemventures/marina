import { crypto } from 'liquidjs-lib';
import type { ElectrumWS } from 'ws-electrumx-client';
import { deserializeBlockHeader } from '../background/utils';
import type { BlockHeader, ChainSource, TransactionHistory } from '../domain/chainsource';

const BroadcastTransaction = 'blockchain.transaction.broadcast'; // returns txid
const EstimateFee = 'blockchain.estimatefee'; // returns fee rate in sats/kBytes
const GetBlockHeader = 'blockchain.block.header'; // returns block header as hex string
const GetHistoryMethod = 'blockchain.scripthash.get_history';
const GetTransactionMethod = 'blockchain.transaction.get'; // returns hex string
const SubscribeStatusMethod = 'blockchain.scripthash'; // ElectrumWS automatically adds '.subscribe'
const GetRelayFeeMethod = 'blockchain.relayfee';

export class WsElectrumChainSource implements ChainSource {
  constructor(private ws: ElectrumWS) {}

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
    await this.ws.subscribe(
      SubscribeStatusMethod,
      (scripthash: unknown, status: unknown) => {
        if (scripthash === scriptHash) {
          callback(scripthash, status as string | null);
        }
      },
      scriptHash
    );
  }

  async fetchHistories(scripts: Buffer[]): Promise<TransactionHistory[]> {
    const scriptsHashes = scripts.map((s) => toScriptHash(s));
    const responses = await this.ws.batchRequest<TransactionHistory[]>(
      ...scriptsHashes.map((s) => ({ method: GetHistoryMethod, params: [s] }))
    );
    return responses;
  }

  async fetchBlockHeaders(heights: number[]): Promise<BlockHeader[]> {
    const responses = await this.ws.batchRequest<string[]>(
      ...heights.map((h) => ({ method: GetBlockHeader, params: [h] }))
    );

    return responses.map(deserializeBlockHeader);
  }

  async estimateFees(targetNumberBlocks: number): Promise<number> {
    const feeRate = await this.ws.request<number>(EstimateFee, targetNumberBlocks);
    return feeRate;
  }

  async broadcastTransaction(hex: string): Promise<string> {
    return this.ws.request<string>(BroadcastTransaction, hex);
  }

  async getRelayFee(): Promise<number> {
    return this.ws.request<number>(GetRelayFeeMethod);
  }

  async close() {
    try {
      await this.ws.close('close');
    } catch (e) {
      console.debug('error closing ws:', e);
    }
  }
}

function toScriptHash(script: Buffer): string {
  return crypto.sha256(script).reverse().toString('hex');
}
