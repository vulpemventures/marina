import { serializerAndDeserializer } from './redux/store';
import { RootReducerState } from './../domain/common';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { browser, Runtime } from 'webextension-polyfill-ts';
import { Store } from 'webext-redux';
import {
  compareEnabledWebsites,
  compareTxsHistoryState,
  compareUtxoState,
  MarinaEvent,
  networkChange,
} from './utils/marina-event';
import { UtxoInterface } from 'ldk';
import { TxsHistory } from '../domain/transaction';
import { AnyAction } from 'redux';
import { Network } from '../domain/network';

export type BrokerOption = (broker: Broker) => void;

export default class Broker {
  private port: Runtime.Port;
  private emitter: SafeEventEmitter;
  // for proxy store
  private store?: Store<RootReducerState, AnyAction>;
  private hostname?: string;
  private utxoState: Record<string, UtxoInterface> = {};
  private txsHistoryState: TxsHistory = {};
  private enabledWebsitesState: Record<Network, string[]> = { regtest: [], liquid: [] };
  private network: Network = 'liquid';

  constructor(options: BrokerOption[] = []) {
    this.emitter = new SafeEventEmitter();
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((message) => this.onMessage(message));

    for (const opt of options) {
      opt(this);
    }
  }

  /**
   * Set up a webext-redux Proxy store
   * + start the store's subscriber
   * @param hostname the injected script's hostname
   */
  static async withProxyStore(hostname: string): Promise<BrokerOption> {
    const s = new Store<RootReducerState, AnyAction>(serializerAndDeserializer);
    await s.ready();

    return (b: Broker) => {
      b.hostname = hostname;
      b.store = s;

      const state = b.store.getState();
      // init the cached states
      b.utxoState = state.wallet.utxoMap;
      b.txsHistoryState = state.txsHistory[state.app.network];
      b.enabledWebsitesState = state.connect.enabledSites;
      b.network = state.app.network;

      // start the subscriber
      b.subscribeToStoreEvents();
    };
  }

  private subscribeToStoreEvents() {
    if (!this.store || !this.hostname) return;

    this.store.subscribe(() => {
      const state = this.store!.getState();
      const newUtxoState = state.wallet.utxoMap;
      const newTxsHistoryState = state.txsHistory[state.app.network];
      const newEnabledWebsites = state.connect.enabledSites;
      const newNetwork = state.app.network;

      const utxosEvents = compareUtxoState(this.utxoState, newUtxoState);
      const txsEvents = compareTxsHistoryState(this.txsHistoryState, newTxsHistoryState);
      const enabledAndDisabledEvents = compareEnabledWebsites(
        this.enabledWebsitesState,
        newEnabledWebsites,
        this.hostname!
      );
      const networkEvents = networkChange(this.network, newNetwork);

      const events: MarinaEvent<any>[] = [
        ...utxosEvents,
        ...txsEvents,
        ...enabledAndDisabledEvents,
        ...networkEvents,
      ];

      this.utxoState = newUtxoState;
      this.txsHistoryState = newTxsHistoryState;
      this.enabledWebsitesState = newEnabledWebsites;
      this.network = newNetwork;

      for (const ev of events) {
        window.dispatchEvent(
          new CustomEvent(`marina_event_${ev.type.toLowerCase()}`, { detail: ev.payload })
        );
      }
    });
  }

  onMessage(message: { id: string; payload: { success: boolean; data?: any; error?: string } }) {
    this.emitter.emit(message.id, message.payload);
  }

  start() {
    // start listening for messages from the injected script in page
    window.addEventListener(
      'message',
      (event) => {
        if (event.source !== window) return;
        if (!event.data) return;

        const { id, name, params } = event.data;
        if (!id || !name) return;
        // forward message to the background script
        this.port.postMessage({
          id,
          name,
          params,
        });

        // listen for events from the background script
        // we are going to notify the injected script in page we got a reponse
        this.emitter.once(id, (result: { success: boolean; data?: any; error?: string }) =>
          window.dispatchEvent(new CustomEvent(id, { detail: result }))
        );
      },
      false
    );
  }
}
