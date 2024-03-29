///// ** Inject <-> Content Script messages ** /////

import type { AccountID, NetworkString } from 'marina-provider';

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

// MessageHandler get request, apply some logic on it and return a responseMessage.
// for async logic the MessageHandler returns a Promise.
// thus, handlers should resolve Success ResponseMessage and Error ResponseMessage
export type MessageHandler<T extends string> = (
  request: RequestMessage<T>
) => Promise<ResponseMessage>;

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

/// ** Background script messages ** /////

enum MessageType {
  Login,
  Logout,
  OpenPopup,
  PopupResponse,
  Restore,
}

export interface Message<T> {
  type: MessageType;
  data: T;
}

export type PopupResponseMessage<ResponseT> = Message<{ response?: ResponseT; error?: string }>;
export type OpenPopupMessage = Message<{ name: PopupName }>;
export type StartServicesMessage = Message<undefined>;
export type StopServicesMessage = Message<undefined>;
export type RestoreMessage = Message<{
  accountID: AccountID;
  network: NetworkString;
  gapLimit: number;
}>;

// popup names are linked to the connect/:name routes
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

export function openPopupMessage(name: PopupName): OpenPopupMessage {
  return { type: MessageType.OpenPopup, data: { name } };
}

export function isOpenPopupMessage(message: unknown): message is OpenPopupMessage {
  return message && (message as any).type === MessageType.OpenPopup && (message as any).data;
}

export function popupResponseMessage<T>(response?: T, error?: string): PopupResponseMessage<T> {
  return { type: MessageType.PopupResponse, data: { response, error } };
}

export function isPopupResponseMessage(message: unknown): message is PopupResponseMessage<any> {
  return message && (message as any).type === MessageType.PopupResponse && (message as any).data;
}

export function startServicesMessage(): StartServicesMessage {
  return { type: MessageType.Login, data: undefined };
}

export function isStartServicesMessage(message: unknown): message is StartServicesMessage {
  return (message && (message as any).type === MessageType.Login) as boolean;
}

export function stopServicesMessage(): StopServicesMessage {
  return { type: MessageType.Logout, data: undefined };
}

export function isStopSevicesMessage(message: unknown): message is StopServicesMessage {
  return (message && (message as any).type === MessageType.Logout) as boolean;
}

export function restoreMessage(
  accountID: AccountID,
  network: NetworkString,
  gapLimit: number
): RestoreMessage {
  return { type: MessageType.Restore, data: { accountID, network, gapLimit } };
}

export function isRestoreMessage(message: unknown): message is RestoreMessage {
  return (message && (message as any).type === MessageType.Restore) as boolean;
}
