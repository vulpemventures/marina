import Broker from '../../content/broker';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage,
} from '../../domain/message';

export const POPUP_RESPONSE = 'POPUP_RESPONSE';

export default class PopupBroker extends Broker {
  static Start() {
    const broker = new PopupBroker();
    broker.start();
  }

  start() {
    super.start(this.messageHandler);
  }

  private messageHandler: MessageHandler = ({ id, name, params }: RequestMessage) => {
    try {
      // only handle POPUP_RESPONSE message (sent via PopupWindowProxy)
      if (name === POPUP_RESPONSE) {
        if (!params || !params[0]) {
          throw new Error('missing data in popup response');
        }
        // forward popup response to background script
        this.backgroundScriptPort.postMessage({ data: params[0] });
        // respond to popup
        return Promise.resolve(newSuccessResponseMessage(id));
      }

      throw new Error(`only ${POPUP_RESPONSE} method are handled by PopupBroker`);
    } catch (error) {
      if (error instanceof Error) {
        return Promise.reject(newErrorResponseMessage(id, error));
      }
    }

    return Promise.resolve(newSuccessResponseMessage(id));
  };
}
