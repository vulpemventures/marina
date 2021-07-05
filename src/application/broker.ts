import { WindowPostMessageStream } from '@metamask/post-message-stream';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { browser, Runtime } from 'webextension-polyfill-ts';
import { MARINA_EVENT } from './backend';

export default class Broker {
  private port: Runtime.Port;
  private emitter: SafeEventEmitter;
  private stream: WindowPostMessageStream;

  constructor() {
    this.emitter = new SafeEventEmitter();
    this.port = browser.runtime.connect();
    this.port.onMessage.addListener((message) => this.onMessage(message));
    this.stream = new WindowPostMessageStream({ target: 'streamInjectScript', name: 'streamContentScript' })
  }

  onMessage(message: { id: string; payload: { success: boolean; data?: any; error?: string } }) {
    if (message.id.includes(MARINA_EVENT)) {
      this.stream.write(message.payload.data);
    } else {
      this.emitter.emit(message.id, message.payload);
    }
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
