import { address, crypto, Transaction } from 'liquidjs-lib';
import type { ElectrumWS } from 'ws-electrumx-client';
import { deserializeBlockHeader } from '../background/utils';
import type { BlockHeader, ChainSource, TransactionHistory, Unspent } from '../domain/chainsource';
import { extractErrorMessage } from '../extension/utility/error';

const BroadcastTransaction = 'blockchain.transaction.broadcast'; // returns txid
const EstimateFee = 'blockchain.estimatefee'; // returns fee rate in sats/kBytes
const GetBlockHeader = 'blockchain.block.header'; // returns block header as hex string
const GetHistoryMethod = 'blockchain.scripthash.get_history';
const GetTransactionMethod = 'blockchain.transaction.get'; // returns hex string
const SubscribeStatusMethod = 'blockchain.scripthash'; // ElectrumWS automatically adds '.subscribe'
const GetRelayFeeMethod = 'blockchain.relayfee';
const ListUnspentMethod = 'blockchain.scripthash.listunspent';

const MISSING_TRANSACTION = 'missingtransaction';
const MAX_FETCH_TRANSACTIONS_ATTEMPTS = 5;

type UnspentElectrum = {
  height: number;
  tx_pos: number;
  tx_hash: string;
};

export class WsElectrumChainSource implements ChainSource {
  constructor(private ws: ElectrumWS) {}

  async fetchTransactions(txids: string[]): Promise<{ txID: string; hex: string }[]> {
    const requests = txids.map((txid) => ({ method: GetTransactionMethod, params: [txid] }));
    for (let i = 0; i < MAX_FETCH_TRANSACTIONS_ATTEMPTS; i++) {
      try {
        const responses = await this.ws.batchRequest<string[]>(...requests);
        return responses.map((hex, i) => ({ txID: txids[i], hex }));
      } catch (e) {
        if (extractErrorMessage(e).includes(MISSING_TRANSACTION)) {
          console.warn('missing transaction error, retrying');
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw e;
      }
    }
    throw new Error('Unable to fetch transactions: ' + txids);
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

  waitForAddressReceivesTx(addr: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.subscribeScriptStatus(address.toOutputScript(addr), (_, status) => {
        if (status !== null) {
          resolve();
        }
      }).catch(reject);
    });
  }

  async listUnspents(addr: string): Promise<Unspent[]> {
    const scriptHash = toScriptHash(address.toOutputScript(addr));
    const unspentsFromElectrum = await this.ws.request<UnspentElectrum[]>(
      ListUnspentMethod,
      scriptHash
    );
    const txs = await this.fetchTransactions(unspentsFromElectrum.map((u) => u.tx_hash));

    return unspentsFromElectrum.map((u, index) => {
      return {
        txid: u.tx_hash,
        vout: u.tx_pos,
        witnessUtxo: Transaction.fromHex(txs[index].hex).outs[u.tx_pos],
      };
    });
  }
}

function toScriptHash(script: Buffer): string {
  return crypto.sha256(script).reverse().toString('hex');
}
