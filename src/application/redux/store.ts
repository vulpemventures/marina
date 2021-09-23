import {
  RESET,
  START_DEEP_RESTORATION,
  START_PERIODIC_UPDATE,
  UPDATE_TAXI_ASSETS,
  UPDATE_TXS,
  UPDATE_UTXOS,
} from './actions/action-types';
import { createStore, applyMiddleware, Store } from 'redux';
import { alias, wrapStore } from 'webext-redux';
import marinaReducer from './reducers';
import {
  fetchAndSetTaxiAssets,
  updateTxsHistory,
  fetchAndUpdateUtxos,
  startAlarmUpdater,
  deepRestorer,
  resetAll,
} from '../backend';
import persistStore from 'redux-persist/es/persistStore';
import { parse, stringify } from '../utils/browser-storage-converters';
import thunk from 'redux-thunk';

export const serializerAndDeserializer = {
  serializer: (payload: any) => stringify(payload),
  deserializer: (payload: any) => parse(payload),
};

const backgroundAliases = {
  [UPDATE_UTXOS]: () => fetchAndUpdateUtxos(),
  [UPDATE_TXS]: () => updateTxsHistory(),
  [UPDATE_TAXI_ASSETS]: () => fetchAndSetTaxiAssets(),
  [START_PERIODIC_UPDATE]: () => startAlarmUpdater(),
  [START_DEEP_RESTORATION]: () => deepRestorer(),
  [RESET]: () => resetAll(),
};

const create = () => createStore(marinaReducer, applyMiddleware(alias(backgroundAliases), thunk));

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

export const wrapMarinaStore = (store: Store) => {
  wrapStore(store, serializerAndDeserializer);
};
