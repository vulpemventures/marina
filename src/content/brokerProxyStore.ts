import { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import { RootReducerState } from '../domain/common';

export class BrokerProxyStore extends Store<RootReducerState, AnyAction> {
  async dispatchAsync(action: AnyAction): Promise<void> {
    await Promise.resolve(this.dispatch(action));
  }
}
