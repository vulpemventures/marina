import Browser from 'webextension-polyfill';
import type { PopupResponseMessage } from '../../domain/message';

export default class PopupWindowProxy<T> {
  sendResponse(message: PopupResponseMessage<T>) {
    Browser.runtime.connect().postMessage(message);
  }
}
