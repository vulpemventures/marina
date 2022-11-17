import { address, crypto, NetworkString } from 'ldk';
import type { Store } from 'redux';
import { updateScriptTaskAction } from '../application/redux/actions/task';
import { addScriptHash } from '../application/redux/actions/transaction';
import {
  selectAccount,
  selectAllAccountsIDs,
  selectUtxosMapByScriptHash,
} from '../application/redux/selectors/wallet.selector';
import type { AccountID } from '../domain/account';
import type { RootReducerState } from '../domain/common';
import type { MapByNetwork } from '../domain/transaction';
import { ElectrumWS } from '../domain/ws/ws-electrs';

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
      callbackWebsocketElectrum(websocket, network, this.marinaStore.dispatch),
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
function callbackWebsocketElectrum(
  websocket: ElectrumWS,
  network: NetworkString,
  dispatch: Store['dispatch']
) {
  return (...params: (string | number)[]) => {
    const scriptHash = params[0] as string;
    const status = params[1] as string | null;
    if (status !== null) {
      // if null, it means no new transaction for this scripthash, so we don't need to update it
      handleUpdateScriptHash(websocket, network, scriptHash, dispatch).catch(console.error);
    }
  };
}

async function handleUpdateScriptHash(
  ws: ElectrumWS,
  network: NetworkString,
  scriptHash: string,
  dispatch: Store['dispatch']
) {
  const response = (await ws.request('blockchain.scripthash.listunspent', scriptHash)) as Array<{
    height: number;
    tx_hash: string;
    tx_pos: number;
  }>;
  dispatch(updateScriptTaskAction(scriptHash, response, network));
}
