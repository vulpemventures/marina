import type { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import type { RootReducerState } from '../domain/common';

// this overwrites the Store class in order to type correctly the dispatch function
// (webext-redux) typings do not returns a promise.
// dispatch = 'synchronously' (don't wait for the action to be sended to background store)
// dispatchAsync = 'asynchronously' (wait for the action to be sended to background store)
export class BrokerProxyStore extends Store<RootReducerState, AnyAction> {
  async dispatchAsync(action: AnyAction): Promise<void> {
    await Promise.resolve(this.dispatch(action));
  }
}
