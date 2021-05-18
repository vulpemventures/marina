import { createStore, applyMiddleware } from 'redux';
import { alias } from 'webext-redux';
import marinaReducer from './reducers';
import { updateAllAssetInfos, updateUtxos } from '../backend';
import persistStore from 'redux-persist/es/persistStore';

const backgroundAliases = {
  UPDATE_UTXOS: () => updateUtxos(),
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS: () => updateAllAssetInfos()
}

const create = () => createStore(marinaReducer,
  applyMiddleware(alias(backgroundAliases)),
);

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

