import {
  address,
  crypto,
  confidential,
  isConfidentialOutput,
  isUnblindedOutput,
  networks,
  NetworkString,
  Output,
  Transaction,
  TxInterface,
  UnblindedOutput,
  unblindTransaction,
} from 'ldk';
import type { Store } from 'redux';
import { addScriptHash, addTx, confirmTx } from '../application/redux/actions/transaction';
import { addUtxo, deleteUtxo } from '../application/redux/actions/utxos';
import {
  History,
  selectAccount,
  selectAccountIDByScriptHash,
  selectAllAccountsIDs,
  selectHistoryDiff,
  selectUtxoByOutpoint,
  selectUtxosMapByScriptHash,
} from '../application/redux/selectors/wallet.selector';
import { toDisplayTransaction } from '../application/utils/transaction';
import type { AccountID } from '../domain/account';
import type { RootReducerState } from '../domain/common';
import type { MapByNetwork } from '../domain/transaction';
import { ElectrumWS } from '../domain/ws/ws-electrs';
import {
  BlockHeader,
  deserializeBlockHeader,
  getAllWalletScripts,
  getPrivateBlindKeyGetter,
} from './utils';

export class WebsocketManager {
  private socketByNetwork: MapByNetwork<ElectrumWS | undefined>;
  private URLs: Record<string, string>;
  private marinaStore: Store<RootReducerState>;

  constructor(urls: Record<string, string>, marinaStore: Store) {
    this.URLs = urls;
    this.socketByNetwork = {
      liquid: undefined,
      regtest: undefined,
      testnet: undefined,
    };

    for (const [net, URL] of Object.entries(this.URLs)) {
      this.socketByNetwork[net as NetworkString] = new ElectrumWS(URL);
    }
    this.marinaStore = marinaStore;
  }

  get availableNetworks(): NetworkString[] {
    return Object.keys(this.URLs) as NetworkString[];
  }

  async initScriptSubscriptions() {
    const state = this.marinaStore.getState();
    for (const network of this.availableNetworks) {
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

    if (Object.keys(this.URLs).includes(net)) {
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
      callbackWebsocketElectrum(websocket, network, this.marinaStore),
      scriptHash
    );
  }
}

// utility function converting an output script hex to a scripthash (reversed sha256 of the script)
// scripthash is used by electrum protocol to identify a script to watch
export function reverseAndHash(script: string): string {
  return crypto.sha256(Buffer.from(script, 'hex')).reverse().toString('hex');
}

// callback for websocket scripthash messages
function callbackWebsocketElectrum(websocket: ElectrumWS, network: NetworkString, store: Store) {
  return (...params: (string | number)[]) => {
    const scriptHash = params[0] as string;
    const status = params[1] as string | null;
    if (status !== null) {
      // if null, it means no new transaction for this scripthash, so we don't need to update it
      handleUpdateScriptHash(websocket, network, scriptHash, store).catch(console.error);
    }
  };
}

// this function is triggered each time a new status is received for a scripthash
async function handleUpdateScriptHash(
  ws: ElectrumWS,
  network: NetworkString,
  scriptHash: string,
  store: Store
) {
  const historyResp = (await ws.request(
    'blockchain.scripthash.get_history',
    scriptHash
  )) as History;
  const historyDiff = selectHistoryDiff(historyResp)(store.getState());

  const accountID = selectAccountIDByScriptHash(scriptHash, network)(store.getState());
  const blindKeyGetter = getPrivateBlindKeyGetter(store, network);
  const walletScripts = await getAllWalletScripts(store, network);

  for (const { txID, height } of historyDiff.newTxs) {
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
  }

  for (const { txID, height } of historyDiff.confirmedTxs) {
    if (height <= 0) continue;
    const blockHeaderHex = (await ws.request('blockchain.block.header', height)) as string;
    const blockHeader = deserializeBlockHeader(blockHeaderHex);
    const action = confirmTx(txID, blockHeader.timestamp, network);
    store.dispatch(action);
  }
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

    if (!input.isPegin) {
      // fetch prevout if not pegin input
      const prevoutHex = (await ws.request('blockchain.transaction.get', prevoutTxID)) as string;
      const prevout = Transaction.fromHex(prevoutHex);
      const prevoutOutput: Output = {
        txid: prevoutTxID,
        vout,
        prevout: prevout.outs[vout],
      };

      txInterface.vin.push({
        txid: prevoutTxID,
        vout,
        prevout: prevoutOutput,
        isPegin: false,
      });
    } else {
      txInterface.vin.push({
        txid: prevoutTxID,
        vout,
        isPegin: true,
      });
    }
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
