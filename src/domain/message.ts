// send from inject script to content script

import type { NetworkString } from 'ldk';
import type { AccountID } from 'marina-provider';

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
  type: 'subscribe-scripts';
  scripts: string[];
  accountID: AccountID;
  network: NetworkString;
}

export function subscribeScriptsMsg(
  scripts: string[],
  accountID: AccountID,
  network: NetworkString
): SubscribeScriptsMessage {
  return { type: 'subscribe-scripts', scripts, network, accountID };
}

export function isSubscribeScriptsMessage(message: unknown): message is SubscribeScriptsMessage {
  return (
    message &&
    (message as any).type === 'subscribe-scripts' &&
    (message as any).scripts &&
    Array.isArray((message as any).scripts) &&
    (message as any).network
  );
}

// StartWebSocketMessage is sent to the background script to start the websocket connection to an electrs instance and subscribe the wallet scripts
// it stops the previous connection with other network
export interface StartWebSocketMessage {
  type: 'start-websocket';
  network: NetworkString;
}

export function startWebSocketMessage(network: NetworkString): StartWebSocketMessage {
  return { type: 'start-websocket', network };
}

export function isStartWebSocketMessage(message: unknown): message is StartWebSocketMessage {
  return message && (message as any).type === 'start-websocket' && (message as any).network;
}

// RestoreAccountTaskMessage is sent to the background page to trigger restoration of an account
// it sent back a RestoreAccountTaskResponseMessage when the restoration is done
export interface RestoreAccountTaskMessage {
  type: 'restore-account-task';
  accountID: AccountID;
  network: NetworkString;
}

export function isRestoreAccountTaskMessage(
  message: unknown
): message is RestoreAccountTaskMessage {
  return (
    message !== undefined &&
    (message as any).type === 'restore-account-task' &&
    (message as any).accountID
  );
}

export function restoreTaskMessage(
  accountID: AccountID,
  network: NetworkString
): RestoreAccountTaskMessage {
  return { type: 'restore-account-task', accountID, network };
}

export interface RestoreAccountTaskResponseMessage {
  type: 'restore-account-task-response';
  accountID: AccountID;
  network: NetworkString;
  success: boolean;
  error?: string;
}

export function isRestoreAccountTaskResponseMessage(
  message: unknown
): message is RestoreAccountTaskResponseMessage {
  return (
    message !== undefined &&
    (message as any).type === 'restore-account-task-response' &&
    (message as any).accountID &&
    (message as any).success !== undefined &&
    (message as any).network
  );
}

export function restoreAccountTaskResponseMessage(
  accountID: AccountID,
  network: NetworkString,
  success: boolean,
  error?: string
): RestoreAccountTaskResponseMessage {
  return { type: 'restore-account-task-response', accountID, network, success, error };
}

export interface ResetMessage {
  type: 'reset';
}

export function isResetMessage(message: unknown): message is ResetMessage {
  return message !== undefined && (message as any).type === 'reset';
}

export function resetMessage(): ResetMessage {
  return { type: 'reset' };
}

// ForceUpdateMessage is sent to the background in order to trigger an update of all the generated addresses for a given account and network.
// once the update is done the background will send a ForceUpdateResponseMessage to the sender.
export interface ForceUpdateMessage {
  type: 'force-update';
  accountID: AccountID;
  network: NetworkString;
}

export function isForceUpdateMessage(message: unknown): message is ForceUpdateMessage {
  return (
    message !== undefined &&
    (message as any).type === 'force-update' &&
    (message as any).accountID &&
    (message as any).network
  );
}

export function forceUpdateMessage(
  accountID: AccountID,
  network: NetworkString
): ForceUpdateMessage {
  return { type: 'force-update', accountID, network };
}

export interface ForceUpdateResponseMessage {
  type: 'force-update-response';
  accountID: AccountID;
  network: NetworkString;
  success: boolean;
  error?: string;
}

export function isForceUpdateResponseMessage(
  message: unknown
): message is ForceUpdateResponseMessage {
  return (
    message !== undefined &&
    (message as any).type === 'force-update-response' &&
    (message as any).accountID &&
    (message as any).network &&
    (message as any).success !== undefined
  );
}

export function forceUpdateResponseMessage(
  accountID: AccountID,
  network: NetworkString,
  success: boolean,
  error?: string
): ForceUpdateResponseMessage {
  return { type: 'force-update-response', accountID, network, success, error };
}
