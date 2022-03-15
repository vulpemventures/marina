import browser from 'webextension-polyfill';
import { serializerAndDeserializer } from '../application/redux/store';
import { stringify } from '../application/utils/browser-storage-converters';
import type {
  MessageHandler,
  PopupName,
  RequestMessage,
  ResponseMessage} from '../domain/message';
import {
  isResponseMessage
} from '../domain/message';
import { BrokerProxyStore } from './brokerProxyStore';

export type BrokerOption = (broker: Broker) => void;

export default class Broker {
  protected store?: BrokerProxyStore = undefined;
  protected backgroundScriptPort: browser.Runtime.Port;
  protected providerName: string;

  constructor(name: string, options: BrokerOption[] = []) {
    this.backgroundScriptPort = browser.runtime.connect();
    for (const opt of options) {
      opt(this);
    }

    this.providerName = name;
  }

  start(handler: MessageHandler) {
    // start listening for messages from the injected script in page
    window.addEventListener(
      'message',
      (event: MessageEvent<any>) => {
        if (!isMessageEvent(event)) return;
        if (event.data.provider !== this.providerName) return;

        // handler should reject and resolve ResponseMessage.
        handler(event.data)
          .then((responseMessage: ResponseMessage) => this.sendMessage(responseMessage))
          .catch((error: any) => {
            if (isResponseMessage(error)) {
              this.sendMessage(error);
              return;
            }

            // this case should never happen!
            // the idea is to handle error in the `handler`
            console.error(`an unhandled error happened in MessageHandler: ${error}`);
          });
      },
      false
    );
  }

  protected async openAndWaitPopup<T>(popupName: PopupName): Promise<T> {
    this.backgroundScriptPort.postMessage({ name: popupName });

    return new Promise<T>((resolve) => {
      this.backgroundScriptPort.onMessage.addListener((message) => {
        resolve(message.data as T);
      });
    });
  }

  // send Message to inject script
  sendMessage(message: ResponseMessage) {
    window.dispatchEvent(new CustomEvent(message.id, { detail: stringify(message.payload) }));
  }

  // Set up a webext-redux Proxy store
  static async WithProxyStore(): Promise<BrokerOption> {
    const proxyStore = new BrokerProxyStore(serializerAndDeserializer);
    await proxyStore.ready();

    return (b: Broker) => {
      b.store = proxyStore;
    };
  }
}

// custom type guard for MessageEvent
function isMessageEvent(event: MessageEvent<any>): event is MessageEvent<RequestMessage> {
  return (
    event.source === window && event.data && event.data.id && event.data.name && event.data.provider
  );
}
