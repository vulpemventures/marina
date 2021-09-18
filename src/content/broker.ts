import SafeEventEmitter from '@metamask/safe-event-emitter';
import browser from 'webextension-polyfill';
import { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import { serializerAndDeserializer } from '../application/redux/store';
import { stringify } from '../application/utils/browser-storage-converters';
import { RootReducerState } from '../domain/common';
import {
  isResponseMessage,
  MessageHandler,
  RequestMessage,
  ResponseMessage,
} from '../domain/message';

export type BrokerOption = (broker: Broker) => void;

export default class Broker {
  protected emitter: SafeEventEmitter;
  protected store?: Store<RootReducerState, AnyAction> = undefined;
  protected backgroundScriptPort: browser.Runtime.Port;

  constructor(options: BrokerOption[] = []) {
    this.emitter = new SafeEventEmitter();
    this.backgroundScriptPort = browser.runtime.connect();
    for (const opt of options) {
      opt(this);
    }
  }

  start(handler: MessageHandler) {
    // start listening for messages from the injected script in page
    window.addEventListener(
      'message',
      (event: MessageEvent<any>) => {
        if (!isMessageEvent(event)) return;

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

  waitForEvent<T>(name: string): Promise<T> {
    return new Promise<T>((resolve) => {
      const handleEventFromPopup = (value: T) => {
        resolve(value);
      };

      this.emitter.once(name, handleEventFromPopup);
    });
  }

  // send Message to inject script
  sendMessage(message: ResponseMessage) {
    window.dispatchEvent(new CustomEvent(message.id, { detail: stringify(message.payload) }));
  }

  // Set up a webext-redux Proxy store
  static async WithProxyStore(): Promise<BrokerOption> {
    const proxyStore = new Store<RootReducerState, AnyAction>(serializerAndDeserializer);
    await proxyStore.ready();

    return (b: Broker) => {
      b.store = proxyStore;
    };
  }
}

// custom type guard for MessageEvent
function isMessageEvent(event: MessageEvent<any>): event is MessageEvent<RequestMessage> {
  return event.source === window && event.data && event.data.id && event.data.name;
}
