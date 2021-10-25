import { PopupResponseMessage } from '../../domain/message';
import WindowProxy from '../../inject/proxy';
import { POPUP_RESPONSE } from './popupBroker';

export default class PopupWindowProxy<T> extends WindowProxy {
  static PROVIDER_NAME = 'connect';

  constructor() {
    super(PopupWindowProxy.PROVIDER_NAME);
  }

  sendResponse(message: PopupResponseMessage<T>): Promise<any> {
    return this.proxy(POPUP_RESPONSE, [message]);
  }
}
