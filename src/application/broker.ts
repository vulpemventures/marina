import EventEmitter from 'events';
import { browser, Runtime } from 'webextension-polyfill-ts';

export default class Broker {
  port: Runtime.Port;
  emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((message) => this.onMessage(message));
  }

  onMessage(message: { id: string; payload: { success: boolean; data?: any; error?: string } }) {
    // emit event when background script reponds
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
