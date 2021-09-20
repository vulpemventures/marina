import { PopupResponseMessage } from '../../domain/message';
import WindowProxy from '../../inject/proxy';
import { POPUP_RESPONSE } from './popupBroker';

export default class PopupWindowProxy<T> extends WindowProxy {
  sendResponse(message: PopupResponseMessage<T>): Promise<any> {
    return this.proxy(POPUP_RESPONSE, [message]);
  }
}
