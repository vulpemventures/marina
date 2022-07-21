import type { Middleware, Store } from 'redux';
import { createStore, applyMiddleware } from 'redux';
import { wrapStore } from 'webext-redux';
import marinaReducer from './reducers';
import persistStore from 'redux-persist/es/persistStore';
import { parse, stringify } from '../utils/browser-storage-converters';
import createSagaMiddleware from 'redux-saga';
import mainSaga from './sagas/main';

export const serializerAndDeserializer = {
  serializer: (payload: any) => stringify(payload),
  deserializer: (payload: any) => parse(payload),
};

// loggerMiddleware is a middleware that logs actions and state after they are dispatched.
// This middleware is not included in production builds. debug purpose only.
const loggerMiddleware: Middleware = (store) => (next) => (action) => {
  console.group(action.type);
  console.info('dispatching', action);
  const result = next(action);
  console.log('next state', store.getState());
  console.groupEnd();
  return result;
};

const create = () => {
  const sagaMiddleware = createSagaMiddleware();
  const middlewares: Middleware[] = [sagaMiddleware];
  if (process.env.NODE_ENV !== 'production') {
    middlewares.push(loggerMiddleware);
  }

  // TODO createStore deprecated?
  const store = createStore(marinaReducer, applyMiddleware(...middlewares));
  sagaMiddleware.run(mainSaga);
  return store;
};

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

export const wrapMarinaStore = (store: Store) => {
  wrapStore(store, serializerAndDeserializer);
};
