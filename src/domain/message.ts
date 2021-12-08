// send from inject script to content script
// request = a call of a provider's method
export interface RequestMessage {
  id: string;
  name: string;
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
export type PopupName = 'enable' | 'sign-msg' | 'sign-pset' | 'spend';

export function isPopupName(name: any): name is PopupName {
  return name === 'enable' || name === 'sign-msg' || name === 'sign-pset' || name === 'spend';
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
export type MessageHandler = (request: RequestMessage) => Promise<ResponseMessage>;

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
