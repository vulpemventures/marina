import { stringify } from '../infrastructure/browser-storage-converters';
import type { MessageHandler, PopupName, RequestMessage, ResponseMessage } from '../domain/message';
import { isPopupResponseMessage, openPopupMessage, isResponseMessage } from '../domain/message';
import type { BackgroundPort } from '../port/message';

export default class Broker<T extends string = string> {
  constructor(protected providerName: string, private backgroundPort: BackgroundPort) {}

  protected start(handler: MessageHandler<T>) {
    // start listening for messages from the injected script in page
    window.addEventListener(
      'message',
      (event: MessageEvent<any>) => {
        if (!isMessageEvent<T>(event)) return; // ignore bad format messages
        if (event.data.provider !== this.providerName) return; // ignore messages from other providers

        // handler should reject and resolve ResponseMessage
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
    await this.backgroundPort.sendMessage(openPopupMessage(popupName));

    return new Promise<T>((resolve) => {
      this.backgroundPort.onMessage((message) => {
        if (isPopupResponseMessage(message)) {
          if (message.data.error) {
            throw new Error(message.data.error);
          }

          resolve(message.data.response as T);
        }
        return Promise.resolve();
      });
    });
  }

  // send Message to inject script
  sendMessage(message: ResponseMessage) {
    window.dispatchEvent(new CustomEvent(message.id, { detail: stringify(message.payload) }));
  }
}

// custom type guard for MessageEvent
function isMessageEvent<T extends string>(
  event: MessageEvent<any>
): event is MessageEvent<RequestMessage<T>> {
  return (
    event.source === window && event.data && event.data.id && event.data.name && event.data.provider
  );
}
