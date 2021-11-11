import { createStore, applyMiddleware, Store, AnyAction } from 'redux';
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

const sagaMiddleware = createSagaMiddleware();
const create = () => createStore(marinaReducer, applyMiddleware(sagaMiddleware));

sagaMiddleware.run(mainSaga);

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

export const wrapMarinaStore = (store: Store) => {
  wrapStore(store, serializerAndDeserializer);
};