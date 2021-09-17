import Broker from '../../content/broker';
import {
  MessageHandler,
  newErrorResponseMessage,
  newSuccessResponseMessage,
  RequestMessage
} from '../../domain/message';

export default class PopupBroker extends Broker {
  static Start() {
    const broker = new PopupBroker();
    broker.start();
  }

  start() {
    super.start(this.messageHandler);
  }

  private messageHandler: MessageHandler = async ({ id, name, params }: RequestMessage) => {
    const successMsg = newSuccessResponseMessage(id);
    switch (name) {
      case 'spend': {
        this.emitter.emit(name, params![0]);
        return successMsg;
      }

      case 'sign-tx': {
        this.emitter.emit(name, params![0]);
        return successMsg;
      }

      case 'sign-msg': {
        this.emitter.emit(name, params![0]);
        return successMsg;
      }

      case 'enable': {
        this.emitter.emit(name, params![0]);
        return successMsg;
      }

      default:
        return newErrorResponseMessage(id, new Error('not implemented'));
    }
  };
}
