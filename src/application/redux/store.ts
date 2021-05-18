import { UPDATE_ASSETS, UPDATE_TXS, UPDATE_UTXOS } from './actions/action-types';
import { createStore, applyMiddleware } from 'redux';
import { alias } from 'webext-redux';
import marinaReducer from './reducers';
import { updateAllAssetInfos, updateTxsHistory, updateUtxos } from '../backend';
import persistStore from 'redux-persist/es/persistStore';

const backgroundAliases = {
  [UPDATE_UTXOS]: () => updateUtxos(),
  [UPDATE_ASSETS]: () => updateAllAssetInfos(),
  [UPDATE_TXS]: () => updateTxsHistory(),
}

const create = () => createStore(marinaReducer,
  applyMiddleware(alias(backgroundAliases)),
);

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

