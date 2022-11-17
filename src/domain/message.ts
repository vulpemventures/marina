// send from inject script to content script

import { NetworkString } from 'ldk';
import { AccountID } from 'marina-provider';

// request = a call of a provider's method
export interface RequestMessage<T extends string> {
  id: string;
  name: T;
  params?: Array<any>;
  provider: string;
}

// the message received by the inject script
// sent by the content script (the broker).
export interface ResponseMessage {
  id: string;
  payload: { success: boolean; data?: any; error?: string };
}

// basically the name of the connect/* files
export type PopupName = 'enable' | 'sign-msg' | 'sign-pset' | 'spend' | 'create-account';

export function isPopupName(name: any): name is PopupName {
  return (
    name === 'enable' ||
    name === 'sign-msg' ||
    name === 'sign-pset' ||
    name === 'spend' ||
    name === 'create-account'
  );
}

export function isResponseMessage(message: unknown): message is ResponseMessage {
  const msg = message as ResponseMessage;
  return (
    msg && msg.id !== undefined && msg.payload !== undefined && msg.payload.success !== undefined
  );
}

export function newSuccessResponseMessage(id: string, data?: any): ResponseMessage {
  return { id, payload: { success: true, data } };
}

export function newErrorResponseMessage(id: string, error: Error): ResponseMessage {
  return { id, payload: { success: false, error: error.message } };
}

// MessageHandler get request, apply some logic on it and return a responseMessage.
// for async logic the MessageHandler returns a Promise.
// thus, handlers should resolve Success ResponseMessage and Error ResponseMessage
export type MessageHandler<T extends string> = (
  request: RequestMessage<T>
) => Promise<ResponseMessage>;

// this message sends to background script in order to open a connected popup.
export interface OpenPopupMessage {
  name: PopupName;
}

export function isOpenPopupMessage(message: unknown): message is OpenPopupMessage {
  return message && (message as any).name && isPopupName((message as any).name);
}

export interface PopupResponseMessage<T = any> {
  data?: T;
}

export function isPopupResponseMessage(message: unknown) {
  return message && ((message as any).data || (message as any).error);
}

export interface SubscribeScriptsMessage {
  scripts: string[];
  accountID: AccountID;
  network: NetworkString;
}

export function subscribeScriptsMsg(
  scripts: string[],
  accountID: AccountID,
  network: NetworkString
): SubscribeScriptsMessage {
  return { scripts, network, accountID };
}

export function isSubscribeScriptsMessage(message: unknown): message is SubscribeScriptsMessage {
  return (
    message &&
    (message as any).scripts &&
    Array.isArray((message as any).scripts) &&
    (message as any).network
  );
}

export interface ReloadAccountsSubscribtionsMessage {
  type: 'reload-accounts-subscribtions';
}

export function isReloadAccountsSubscribtionsMessage(
  message: unknown
): message is ReloadAccountsSubscribtionsMessage {
  return message !== undefined && (message as any).type === 'reload-accounts-subscribtions';
}

export function reloadAccountsSubscribtionsMsg(): ReloadAccountsSubscribtionsMessage {
  return { type: 'reload-accounts-subscribtions' };
}
