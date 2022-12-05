import axios from 'axios';
import type { NetworkString, Output, TxInterface, UnblindedOutput } from 'ldk';
import {
  getAsset,
  address,
  crypto,
  confidential,
  isConfidentialOutput,
  isUnblindedOutput,
  Transaction,
  unblindTransaction,
} from 'ldk';
import type { Store } from 'redux';
import { addAsset } from '../application/redux/actions/asset';
import { addScriptHash, addTx, confirmTx } from '../application/redux/actions/transaction';
import { addUtxo, deleteUtxo, unlockUtxos } from '../application/redux/actions/utxos';
import { popUpdaterLoader, pushUpdaterLoader } from '../application/redux/actions/wallet';
import {
  selectHTTPExplorerURL,
  selectWSExplorerURL,
} from '../application/redux/selectors/app.selector';
import type { History } from '../application/redux/selectors/wallet.selector';
import {
  selectTransactionByID,
  selectTransactions,
  selectIsKnownTx,
  selectAccount,
  selectAccountIDByScriptHash,
  selectAllAccountsIDs,
  selectHistoryDiff,
  selectUtxoByOutpoint,
  selectUtxosMapByScriptHash,
} from '../application/redux/selectors/wallet.selector';
import { sleep } from '../application/utils/common';
import { defaultPrecision } from '../application/utils/constants';
import type { AccountID } from '../domain/account';
import type { Asset } from '../domain/assets';
import type { RootReducerState } from '../domain/common';
import { txIsSpending } from '../domain/transaction';
import { ElectrumWS } from './ws/ws-electrs';
import type { BlockHeader } from './utils';
import { deserializeBlockHeader, getAllWalletScripts, getPrivateBlindKeyGetter } from './utils';

type StatusWorkerJob = { scripthash: string; network: NetworkString; id: number };

export class WebsocketManager {
  static SUPPORTED_NETWORKS: NetworkString[] = ['liquid', 'regtest', 'testnet'];

  private marinaStore: Store<RootReducerState>;
  private socket: ElectrumWS;

  private jobs: Array<StatusWorkerJob> = [];
  private started = false;

  constructor(marinaStore: Store) {
    this.marinaStore = marinaStore;
    this.socket = new ElectrumWS(selectWSExplorerURL()(marinaStore.getState()));
  }

  // init the websockets subscriptions according to the accounts state
  // 1 address = 1 scriptHash to subscribe
  private async subscribeGeneratedScripthashes(network: NetworkString): Promise<void> {
    if (!WebsocketManager.SUPPORTED_NETWORKS.includes(network))
      throw new Error('Network not supported by websocket manager');
    const state = this.marinaStore.getState();
    for (const accountID of selectAllAccountsIDs(state)) {
      const account = selectAccount(accountID)(state);
      if (account) {
        const id = await account.getWatchIdentity(network);
        const addresses = await id.getAddresses();
        const scripts = addresses.map((a) =>
          address.toOutputScript(a.confidentialAddress).toString('hex')
        );
        for (const script of scripts) {
          await this.subscribeScript(network, accountID, script);
        }
      }
    }
  }

  async subscribeScript(network: NetworkString, accountID: AccountID, scriptHex: string) {
    const scriptHash = reverseAndHash(scriptHex);
    try {
      selectUtxosMapByScriptHash(network, scriptHash)(this.marinaStore.getState());
    } catch {
      // if we don't have utxos for this scriptHash, we need to init its state
      this.marinaStore.dispatch(addScriptHash(accountID, scriptHash, network));
    }
    await this.socket.subscribe(
      'blockchain.scripthash',
      this.callbackWebsocketElectrum(network),
      scriptHash
    );
  }

  private callbackWebsocketElectrum(network: NetworkString) {
    return (...params: (string | number)[]) => {
      const scriptHash = params[0] as string;
      const status = params[1] as string | null;
      // if null, it means no new transaction for this scripthash, so we don't need to update it
      if (status !== null) {
        this.jobs.push({ scripthash: scriptHash, network, id: Math.floor(Math.random() * 1000) });
      }
    };
  }

  // select the job with network = current selected network first
  private popMaxPriorityJob(): StatusWorkerJob | undefined {
    if (this.jobs.length === 0) return undefined;
    const [selected, ...others] = this.jobs;
    if (selected) {
      this.jobs = others;
      return selected;
    }
    return undefined;
  }

  async switchSocket(network: NetworkString): Promise<void> {
    try {
      await this.stop();
    } finally {
      this.socket = new ElectrumWS(selectWSExplorerURL(network)(this.marinaStore.getState()));
      await this.subscribeGeneratedScripthashes(network);
    }
  }

  // start the status worker
  async start(network: NetworkString): Promise<void> {
    await this.switchSocket(network);
    this.started = true;

    while (this.started) {
      try {
        const job = this.popMaxPriorityJob();
        if (!job) {
          await sleep(1000);
          continue;
        }
        const { scripthash, network } = job;
        await this.updateAddressHistory(this.socket, network, scripthash, this.marinaStore);
      } catch {
        continue;
      }
    }
  }

  // stop the status worker
  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    await this.socket.close('disconnection');
  }

  async forceUpdate(scripthash: string, network: NetworkString): Promise<void> {
    await this.updateAddressHistory(this.socket, network, scripthash, this.marinaStore);
  }

  async forceUpdateAccount(accountID: AccountID, network: NetworkString): Promise<void> {
    const account = selectAccount(accountID)(this.marinaStore.getState());
    if (!account) throw new Error(`Account ${accountID} not found`);
    const id = await account.getWatchIdentity(network);
    const addresses = await id.getAddresses();

    const scriptsHashes = addresses
      .map((a) => address.toOutputScript(a.confidentialAddress).toString('hex'))
      .map(reverseAndHash);

    // init the reducer state in order to link account to scripthash
    for (const scripthash of scriptsHashes) {
      try {
        selectUtxosMapByScriptHash(network, scripthash)(this.marinaStore.getState());
      } catch {
        this.marinaStore.dispatch(addScriptHash(accountID, scripthash, network));
      }
    }

    for (const scriptHash of scriptsHashes) {
      await this.forceUpdate(scriptHash, network);
    }
  }

  // fetch a tx (and its prevouts) from websocket endpoint using the blockchain.transaction.get method
  private async fetchTx(ws: ElectrumWS, txID: string, blockheight?: number): Promise<TxInterface> {
    const txHex = (await ws.request('blockchain.transaction.get', txID)) as string;
    const transaction = Transaction.fromHex(txHex);

    let blockHeader: BlockHeader | undefined;
    if (blockheight) {
      const blockHeaderHex = (await ws.request('blockchain.block.header', blockheight)) as string;
      blockHeader = deserializeBlockHeader(blockHeaderHex);
    }

    const txInterface: TxInterface = {
      txid: txID,
      fee: 0,
      status: {
        confirmed: blockHeader !== undefined,
        blockHeight: blockHeader?.height,
        blockTime: blockHeader?.timestamp,
      },
      vin: [],
      vout: [],
    };

    for (const input of transaction.ins) {
      const prevoutTxID = Buffer.from(input.hash).reverse().toString('hex');
      const vout = input.index;

      // prevent fetching the prevout if it is a pegin prevout
      const prevout: Output | undefined = input.isPegin
        ? undefined
        : await this.getOrFetchOutput(prevoutTxID, vout);

      txInterface.vin.push({
        txid: prevoutTxID,
        vout,
        isPegin: input.isPegin ?? false,
        prevout,
      });
    }

    for (let outIndex = 0; outIndex < transaction.outs.length; outIndex++) {
      const output = transaction.outs[outIndex];
      txInterface.vout.push({
        txid: txID,
        vout: outIndex,
        prevout: output,
      });

      // if fee output, add the fee value
      if (output.script.length === 0) {
        txInterface.fee = confidential.confidentialValueToSatoshi(output.value);
      }
    }

    return txInterface;
  }

  // getOutput tries to fetch the output from the store, if not found, it fetches it from the websocket endpoint
  private async getOrFetchOutput(txid: string, vout: number): Promise<Output> {
    const tx = selectTransactionByID(txid)(this.marinaStore.getState());
    if (tx) return tx.vout[vout];
    const txHex = (await this.socket.request('blockchain.transaction.get', txid)) as string;
    const transaction = Transaction.fromHex(txHex);
    return {
      txid,
      vout,
      prevout: transaction.outs[vout],
    };
  }

  // getTx will try to return the tx from the marina store, if not found, it will fetch it from the websocket endpoint
  private async getOrFetchTx(txid: string, blockheight?: number): Promise<TxInterface> {
    const tx = selectTransactionByID(txid)(this.marinaStore.getState());
    if (tx) return tx;
    return this.fetchTx(this.socket, txid, blockheight);
  }

  // updateAccountHisory is triggered each time a new status is received for a scripthash
  // it fetches the new txs from history and updates the utxos and transactions state
  // updateTransactionsHistory
  private async updateAddressHistory(
    ws: ElectrumWS,
    network: NetworkString,
    scriptHash: string,
    store: Store
  ): Promise<void> {
    const historyResp = (await ws.request(
      'blockchain.scripthash.get_history',
      scriptHash
    )) as History;
    const historyDiff = selectHistoryDiff(historyResp)(store.getState());
    const accountID = selectAccountIDByScriptHash(scriptHash, network)(store.getState());
    const blindKeyGetter = getPrivateBlindKeyGetter(store, network);

    for (const { txID, height } of historyDiff.confirmedTxs) {
      if (height <= 0) continue;
      const blockHeaderHex = (await ws.request('blockchain.block.header', height)) as string;
      const blockHeader = deserializeBlockHeader(blockHeaderHex);
      const action = confirmTx(txID, blockHeader.timestamp, network);
      store.dispatch(action);
    }

    // for each new tx which is not in the state, we fetch the transaction and unblind it
    for (const { txID, height } of historyDiff.newTxs) {
      if (selectIsKnownTx(txID)(store.getState())) continue;
      try {
        store.dispatch(pushUpdaterLoader());
        const newTransaction = await this.getOrFetchTx(txID, height);
        const { unblindedTx } = await unblindTransaction(newTransaction, blindKeyGetter);

        // add the new tx to the store
        store.dispatch(addTx(accountID, newTransaction, network));

        // check if any utxos were spent in this tx
        for (const input of unblindedTx.vin) {
          const [utxoInStore, accountID] = selectUtxoByOutpoint(input, network)(store.getState());
          if (utxoInStore) store.dispatch(deleteUtxo(accountID, input.txid, input.vout, network));
        }

        const state = store.getState();
        const allTransactions = selectTransactions(...selectAllAccountsIDs(state))(state);

        // check if we have any new utxos
        const walletScripts = await getAllWalletScripts(state, network);
        const walletOutputs = unblindedTx.vout
          .filter((o) => {
            if (isConfidentialOutput(o)) {
              return isUnblindedOutput(o);
            }

            return walletScripts.includes(o.prevout.script.toString('hex'));
          })
          .filter(
            (walletOutput) =>
              !allTransactions.some((tx) => txIsSpending(newTransaction, { ...walletOutput }))
          );

        // add the new utxos to the store
        const actions = walletOutputs.map((o) => addUtxo(accountID, o as UnblindedOutput, network));
        actions.forEach(store.dispatch);

        const walletOutputsAssets = new Set(walletOutputs.map((o) => getAsset(o)));
        const assetsNeedUpdate = Array.from(walletOutputsAssets).filter((a) =>
          assetNeedUpdate(store, a)
        );
        const assetsInfos = await Promise.allSettled(
          assetsNeedUpdate.map((a) => fetchAssetInfoFromEsplora(store, a, network))
        );
        for (let i = 0; i < assetsNeedUpdate.length; i++) {
          const asset = assetsNeedUpdate[i];
          const assetInfo = assetsInfos[i];
          if (assetInfo.status === 'fulfilled') {
            store.dispatch(addAsset(asset, assetInfo.value));
          }
        }
      } finally {
        store.dispatch(popUpdaterLoader());
      }
    }

    // at the end of the update, free the locked utxos
    if (historyDiff.newTxs.length > 0) store.dispatch(unlockUtxos());
  }
}

// utility function converting an output script hex to a scripthash (reversed sha256 of the script)
// scripthash is used by electrum protocol to identify a script to watch
export function reverseAndHash(script: string): string {
  return crypto.sha256(Buffer.from(script, 'hex')).reverse().toString('hex');
}

function assetNeedUpdate(store: Store<RootReducerState>, assetHash: string): boolean {
  const assets = new Set(Object.keys(store.getState().assets));
  if (!assets.has(assetHash)) return true; // fetch if the asset is not in the state
  const asset = store.getState().assets[assetHash];
  if (!asset) return true;
  if (asset.ticker === assetHash.slice(0, 4).toUpperCase()) return true; // fetch if the ticker is not in the state
  return false;
}

async function fetchAssetInfoFromEsplora(
  store: Store<RootReducerState>,
  assetHash: string,
  network: NetworkString
): Promise<Asset> {
  const webExplorerURL = selectHTTPExplorerURL(network)(store.getState());
  const result = await (() =>
    axios.get(`${webExplorerURL}/asset/${assetHash}`).then((r) => r.data))();

  return {
    name: result?.name ?? 'Unknown',
    ticker: result?.ticker ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}
