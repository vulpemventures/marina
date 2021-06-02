import { UPDATE_TAXI_ASSETS, UPDATE_TXS, UPDATE_UTXOS } from './actions/action-types';
import { createStore, applyMiddleware, Store } from 'redux';
import { alias, wrapStore } from 'webext-redux';
import marinaReducer from './reducers';
import { fetchAndSetTaxiAssets, updateTxsHistory, updateUtxos } from '../backend';
import persistStore from 'redux-persist/es/persistStore';
import { parse, stringify } from '../utils/browser-storage-converters';

export const serializerAndDeserializer = {
  serializer: (payload: any) => stringify(payload),
  deserializer: (payload: any) => parse(payload),
};

const backgroundAliases = {
  [UPDATE_UTXOS]: () => updateUtxos(),
  [UPDATE_TXS]: () => updateTxsHistory(),
  [UPDATE_TAXI_ASSETS]: () => fetchAndSetTaxiAssets(),
};

const create = () => createStore(marinaReducer, applyMiddleware(alias(backgroundAliases)));

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

export const wrapMarinaStore = (store: Store) => {
  wrapStore(store, serializerAndDeserializer);
};
