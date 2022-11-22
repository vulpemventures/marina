import axios from 'axios';
import type { NetworkString, Output, TxInterface, UnblindedOutput } from 'ldk';
import {
  getAsset,
  address,
  crypto,
  confidential,
  isConfidentialOutput,
  isUnblindedOutput,
  networks,
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
  selectNetwork,
  selectWSExplorerURL,
} from '../application/redux/selectors/app.selector';
import type { History } from '../application/redux/selectors/wallet.selector';
import {
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
import { toDisplayTransaction } from '../application/utils/transaction';
import type { AccountID } from '../domain/account';
import type { Asset } from '../domain/assets';
import type { RootReducerState } from '../domain/common';
import type { MapByNetwork } from '../domain/transaction';
import { ElectrumWS } from '../domain/ws/ws-electrs';
import type { BlockHeader } from './utils';
import { deserializeBlockHeader, getAllWalletScripts, getPrivateBlindKeyGetter } from './utils';

type StatusWorkerJob = { scripthash: string; network: NetworkString; id: number };

export class WebsocketManager {
  static SUPPORTED_NETWORKS: NetworkString[] = ['liquid', 'regtest', 'testnet'];

  private socketByNetwork: MapByNetwork<ElectrumWS | undefined>;
  private marinaStore: Store<RootReducerState>;

  private jobs: Array<StatusWorkerJob> = [];
  private started = false;

  constructor(marinaStore: Store) {
    this.socketByNetwork = {
      liquid: undefined,
      regtest: undefined,
      testnet: undefined,
    };

    this.marinaStore = marinaStore;
    for (const net of WebsocketManager.SUPPORTED_NETWORKS) {
      this.socketByNetwork[net] = new ElectrumWS(selectWSExplorerURL(net)(marinaStore.getState()));
    }
  }

  // init the websockets subscriptions according to the accounts state
  // 1 address = 1 scriptHash to subscribe
  async subscribeGeneratedScripthashes() {
    const state = this.marinaStore.getState();
    for (const network of WebsocketManager.SUPPORTED_NETWORKS) {
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
  }

  private socket(net: NetworkString): ElectrumWS {
    if (!this.socketByNetwork || Object.keys(this.socketByNetwork).length === 0) {
      throw new Error('WebsocketManager not started');
    }

    if (WebsocketManager.SUPPORTED_NETWORKS.includes(net)) {
      const socket = this.socketByNetwork[net];
      if (!socket) throw new Error('websocket is not initialized for network ' + net);
      return socket;
    }

    throw new Error('Network not supported');
  }

  async subscribeScript(network: NetworkString, accountID: AccountID, scriptHex: string) {
    const scriptHash = reverseAndHash(scriptHex);
    const websocket = this.socket(network);
    try {
      selectUtxosMapByScriptHash(network, scriptHash)(this.marinaStore.getState());
    } catch {
      // if we don't have utxos for this scriptHash, we need to init its state
      this.marinaStore.dispatch(addScriptHash(accountID, scriptHash, network));
    }
    await websocket.subscribe(
      'blockchain.scripthash',
      this.callbackWebsocketElectrum(network, this.marinaStore),
      scriptHash
    );
  }

  private callbackWebsocketElectrum(network: NetworkString, store: Store) {
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
    const jobs = this.jobs;
    if (jobs.length === 0) return undefined;
    let selectedJob = jobs[0];
    const currentNetwork = selectNetwork(this.marinaStore.getState());
    // if we have a job for the current network, we take it first
    const job = jobs.find((j) => j.network === currentNetwork);
    if (job) selectedJob = job;
    // remove the selected job
    this.jobs = this.jobs.filter((j) => j.id !== selectedJob.id);
    return selectedJob;
  }

  // start the status worker
  async start(): Promise<void> {
    this.started = true;
    while (this.started) {
      try {
        const job = this.popMaxPriorityJob();
        if (!job) {
          await sleep(1000);
          continue;
        }
        const { scripthash, network } = job;
        const socket = this.socket(network);

        this.marinaStore.dispatch(pushUpdaterLoader());
        await updateScriptHash(socket, network, scripthash, this.marinaStore);
        this.marinaStore.dispatch(popUpdaterLoader());
      } catch {
        continue;
      }
    }
  }

  // stop the status worker
  stop(): void {
    this.started = false;
  }
}

// utility function converting an output script hex to a scripthash (reversed sha256 of the script)
// scripthash is used by electrum protocol to identify a script to watch
export function reverseAndHash(script: string): string {
  return crypto.sha256(Buffer.from(script, 'hex')).reverse().toString('hex');
}

// this function is triggered each time a new status is received for a scripthash
// it fetches the new txs from history and updates the utxos and transactions state
async function updateScriptHash(
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
  const walletScripts = await getAllWalletScripts(store, network);

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
    const txFromElectrum = await fetchTx(ws, txID, height > 0 ? height : undefined);
    const { unblindedTx } = await unblindTransaction(txFromElectrum, blindKeyGetter);
    const displayTx = toDisplayTransaction(unblindedTx, walletScripts, networks[network]);

    // add the new tx to the store
    store.dispatch(addTx(accountID, displayTx, network));

    // check if any utxos were spent in this tx
    for (const input of unblindedTx.vin) {
      const [utxoInStore, accountID] = selectUtxoByOutpoint(input, network)(store.getState());
      if (utxoInStore) store.dispatch(deleteUtxo(accountID, input.txid, input.vout, network));
    }

    // check if we have any new utxos
    const walletOutputs = unblindedTx.vout.filter((o) => {
      if (isConfidentialOutput(o)) {
        return isUnblindedOutput(o);
      }

      return walletScripts.includes(o.prevout.script.toString('hex'));
    });

    // add the new utxos to the store
    const actions = walletOutputs.map((o) => addUtxo(accountID, o as UnblindedOutput, network));
    actions.forEach(store.dispatch);

    const walletOutputsAssets = new Set(walletOutputs.map((o) => getAsset(o)));
    const assetsNeedUpdate = Array.from(walletOutputsAssets).filter((a) =>
      assetNeedUpdate(store, a)
    );
    const assetsInfos = await Promise.allSettled(
      assetsNeedUpdate.map((a) => requestAssetInfoFromEsplora(store, a, network))
    );
    for (let i = 0; i < assetsNeedUpdate.length; i++) {
      const asset = assetsNeedUpdate[i];
      const assetInfo = assetsInfos[i];
      if (assetInfo.status === 'fulfilled') {
        store.dispatch(addAsset(asset, assetInfo.value));
      }
    }
  }

  // at the end of the update, free the locked utxos
  store.dispatch(unlockUtxos());
}

// fetch a tx (and its prevouts) from websocket endpoint using the blockchain.transaction.get method
async function fetchTx(ws: ElectrumWS, txID: string, blockheight?: number): Promise<TxInterface> {
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
      : {
          txid: prevoutTxID,
          vout,
          prevout: Transaction.fromHex(await ws.request('blockchain.transaction.get', prevoutTxID))
            .outs[vout],
        };

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

function assetNeedUpdate(store: Store<RootReducerState>, assetHash: string): boolean {
  const assets = new Set(Object.keys(store.getState().assets));
  if (!assets.has(assetHash)) return true; // fetch if the asset is not in the state
  const asset = store.getState().assets[assetHash];
  console.log(asset, 'GOT ASSET');
  if (!asset) return true;
  if (asset.ticker === assetHash.slice(0, 4).toUpperCase()) return true; // fetch if the ticker is not in the state
  return false;
}

async function requestAssetInfoFromEsplora(
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
