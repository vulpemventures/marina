import { Action, createStore } from 'redux';
import marinaReducer from './reducers';

const marinaStore = createStore(marinaReducer);

export type RootState = ReturnType<typeof marinaStore.getState>;
export type AppDispatch = typeof marinaStore.dispatch;

export interface ActionWithPayload<T> extends Action<string> {
  payload: T;
}

export default marinaStore;