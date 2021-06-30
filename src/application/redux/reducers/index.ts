import { assetInitState, assetReducer } from './asset-reducer';
import { onboardingReducer } from './onboarding-reducer';
import { walletInitState, walletReducer } from './wallet-reducer';
import { transactionInitState, transactionReducer, TransactionState } from './transaction-reducer';
import { txsHistoryReducer, txsHistoryInitState } from './txs-history-reducer';
import { AnyAction, combineReducers, Reducer } from 'redux';
import { appInitState, appReducer } from './app-reducer';
import { connectDataReducer } from './connect-data-reducer';
import { Storage } from 'redux-persist';
import { parse, stringify } from '../../utils/browser-storage-converters';
import { browser } from 'webextension-polyfill-ts';
import persistReducer, { PersistPartial } from 'redux-persist/es/persistReducer';
import { IApp } from '../../../domain/app';
import { TxsHistoryByNetwork } from '../../../domain/transaction';
import { IWallet } from '../../../domain/wallet';
import { taxiReducer, TaxiState, taxiInitState } from './taxi-reducer';
import { ConnectData, newEmptyConnectData } from '../../../domain/connect';
import { IAssets } from '../../../domain/assets';
import { PersistConfig } from 'redux-persist/lib/types';

const browserLocalStorage: Storage = {
  getItem: async (key: string) => {
    const value = await browser.storage.local.get(key);
    return parse(value[key] || '');
  },
  setItem: async (key: string, value: any) => {
    const map = { [key]: stringify(value) };
    await browser.storage.local.set(map);
  },
  removeItem: async (key: string) => browser.storage.local.remove(key),
};

function createLocalStorageConfig<S>(
  initialState: S,
  key: string,
  whitelist?: string[],
  blacklist?: string[],
  version = 0
): PersistConfig<S, any, any, any> {
  return {
    key,
    storage: browserLocalStorage,
    version,
    whitelist,
    blacklist,
    migrate: (state: any) => {
      return Promise.resolve({
        ...state,
        ...initialState,
      });
    },
  };
}

// custom persist reducer function
function persist<S extends any>(opts: {
  reducer: Reducer<S, AnyAction>;
  initialState: S;
  key: string;
  whitelist?: string[];
  blacklist?: string[];
  version?: number;
}): Reducer<S & PersistPartial, AnyAction> {
  return persistReducer(
    createLocalStorageConfig(
      opts.initialState,
      opts.key,
      opts.whitelist,
      opts.blacklist,
      opts.version
    ),
    opts.reducer
  );
}

const marinaReducer = combineReducers({
  app: persist<IApp>({ reducer: appReducer, key: 'app', version: 1, initialState: appInitState }),
  assets: persist<IAssets>({
    reducer: assetReducer,
    key: 'assets',
    version: 1,
    initialState: assetInitState,
  }),
  onboarding: onboardingReducer,
  transaction: persist<TransactionState>({
    reducer: transactionReducer,
    key: 'transaction',
    version: 1,
    initialState: transactionInitState,
  }),
  txsHistory: persist<TxsHistoryByNetwork>({
    reducer: txsHistoryReducer,
    key: 'txsHistory',
    version: 1,
    initialState: txsHistoryInitState,
  }),
  wallet: persist<IWallet>({
    reducer: walletReducer,
    key: 'wallet',
    blacklist: ['deepRestorer'],
    version: 1,
    initialState: walletInitState,
  }),
  taxi: persist<TaxiState>({
    reducer: taxiReducer,
    key: 'taxi',
    version: 1,
    initialState: taxiInitState,
  }),
  connect: persist<ConnectData>({
    reducer: connectDataReducer,
    key: 'connect',
    whitelist: ['enabledSites'],
    version: 1,
    initialState: newEmptyConnectData(),
  }),
});

export default marinaReducer;
