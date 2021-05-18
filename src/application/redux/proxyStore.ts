import { RootReducerState } from './../../domain/common';
import { serializerAndDeserializer } from './store';
import { AnyAction } from "redux";
import { Store } from "webext-redux";

export type ProxyStoreDispatch = (action: AnyAction) => Promise<void>;

export class ProxyStore extends Store<RootReducerState, AnyAction> {
  constructor() {
    super(serializerAndDeserializer);
  }
}
