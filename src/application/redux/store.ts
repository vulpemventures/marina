import { Action, createStore, applyMiddleware } from 'redux';
import { alias } from 'webext-redux';
import marinaReducer from './reducers';
import { updateAllAssetInfos, updateUtxos } from '../backend';

const backgroundAliases = {
  UPDATE_UTXOS: () => updateUtxos(),
  ASSET_UPDATE_ALL_ASSET_INFOS_SUCCESS: () => updateAllAssetInfos()
}

const marinaStore = createStore(marinaReducer,
  applyMiddleware(alias(backgroundAliases))
);

export type RootState = ReturnType<typeof marinaStore.getState>;
export type AppDispatch = typeof marinaStore.dispatch;

export interface ActionWithPayload<T> extends Action<string> {
  payload: T;
}

export default marinaStore;