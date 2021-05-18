import { RootReducerState } from './../../domain/common';
import { createStore, applyMiddleware, Middleware } from 'redux';
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

const logger: Middleware<{}, RootReducerState> = store => next => action => {
  console.log(action.type)
}

export const marinaStore = create();
export const persistor = persistStore(marinaStore);

