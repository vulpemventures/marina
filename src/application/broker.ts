import { serializerAndDeserializer } from './redux/store';
import { RootReducerState } from './../domain/common';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { browser, Runtime } from 'webextension-polyfill-ts';
import { Store } from 'webext-redux';
import {
  compareTxsHistoryState,
  compareUtxoState,
  MarinaEvent,
} from './utils/marina-event';
import { UtxoInterface } from 'ldk';
import { TxsHistory } from '../domain/transaction';
import { AnyAction } from 'redux';

export default class Broker {
  private port: Runtime.Port;
  private emitter: SafeEventEmitter;
  private utxoState: Record<string, UtxoInterface> = {};
  private txsHistoryState: TxsHistory = {};

  constructor() {
    this.emitter = new SafeEventEmitter();
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((message) => this.onMessage(message));

    const store = new Store<RootReducerState, AnyAction>(serializerAndDeserializer);
    store
      .ready()
      .then(() => {
        store.subscribe(() => {
          const state = store.getState();
          const newUtxoState = state.wallet.utxoMap;
          const newTxsHistoryState = state.txsHistory[state.app.network];

          const utxosEvents = compareUtxoState(this.utxoState, newUtxoState);
          const txsEvents = compareTxsHistoryState(this.txsHistoryState, newTxsHistoryState);

          const events: MarinaEvent<any>[] = [...utxosEvents, ...txsEvents];
          this.utxoState = newUtxoState;
          this.txsHistoryState = newTxsHistoryState;

          for (const ev of events) {
            window.dispatchEvent(
              new CustomEvent(`marina_event_${ev.type.toLowerCase()}`, { detail: ev.payload })
            );
          }
        });
      })
      .catch(console.error);
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
