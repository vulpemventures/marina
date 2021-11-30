import { assetInitState, assetReducer } from './asset-reducer';
import { onboardingReducer } from './onboarding-reducer';
import { transactionReducer, TransactionState, transactionInitState } from './transaction-reducer';
import { txsHistoryReducer, txsHistoryInitState } from './txs-history-reducer';
import { AnyAction, combineReducers, Reducer } from 'redux';
import { PersistMigrate, Storage } from 'redux-persist';
import { parse, stringify } from '../../utils/browser-storage-converters';
import browser from 'webextension-polyfill';
import persistReducer, { PersistPartial } from 'redux-persist/es/persistReducer';
import { IApp } from '../../../domain/app';
import { TxsHistoryByNetwork } from '../../../domain/transaction';
import { IWallet } from '../../../domain/wallet';
import { taxiReducer, TaxiState, taxiInitState } from './taxi-reducer';
import { ConnectData } from '../../../domain/connect';
import { IAssets } from '../../../domain/assets';
import { PersistConfig } from 'redux-persist/lib/types';
import { appReducer, appInitState } from './app-reducer';
import { walletInitState, walletReducer } from './wallet-reducer';
import { connectDataReducer, connectDataInitState } from './connect-data-reducer';

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

// init state DOES NOT erase the current state during migration
const migrateAfter =
  (initialState: any): PersistMigrate =>
  (state: any) =>
    Promise.resolve({
      ...initialState,
      ...state, // /!\ state should be merged **after** initialState !
    });

// init state erases the current state during migration
const migrateBefore =
  (initialState: any): PersistMigrate =>
  (state: any) =>
    Promise.resolve({
      ...state, // /!\ state should be merged **before** initialState !
      ...initialState,
    });

function createLocalStorageConfig<S>(
  key: string,
  migration: PersistMigrate,
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
    migrate: migration,
  };
}

// custom persist reducer function
function persist<S extends any>(opts: {
  reducer: Reducer<S, AnyAction>;
  migrate: PersistMigrate;
  key: string;
  whitelist?: string[];
  blacklist?: string[];
  version?: number;
}): Reducer<S & PersistPartial, AnyAction> {
  return persistReducer(
    createLocalStorageConfig(opts.key, opts.migrate, opts.whitelist, opts.blacklist, opts.version),
    opts.reducer
  );
}

const marinaReducer = combineReducers({
  app: persist<IApp>({
    reducer: appReducer,
    key: 'app',
    version: 1,
    migrate: migrateAfter(appInitState),
  }),
  assets: persist<IAssets>({
    reducer: assetReducer,
    key: 'assets',
    version: 2,
    migrate: migrateBefore(assetInitState),
  }),
  onboarding: onboardingReducer,
  transaction: persist<TransactionState>({
    reducer: transactionReducer,
    key: 'transaction',
    version: 1,
    migrate: migrateAfter(transactionInitState),
  }),
  txsHistory: persist<TxsHistoryByNetwork>({
    reducer: txsHistoryReducer,
    key: 'txsHistory',
    version: 2,
    migrate: migrateAfter(txsHistoryInitState),
  }),
  wallet: persist<IWallet>({
    reducer: walletReducer,
    key: 'wallet',
    blacklist: ['deepRestorer'],
    version: 1,
    migrate: migrateAfter(walletInitState),
  }),
  taxi: persist<TaxiState>({
    reducer: taxiReducer,
    key: 'taxi',
    version: 1,
    migrate: migrateAfter(taxiInitState),
  }),
  connect: persist<ConnectData>({
    reducer: connectDataReducer,
    key: 'connect',
    whitelist: ['enabledSites'],
    version: 1,
    migrate: migrateAfter(connectDataInitState),
  }),
});

export default marinaReducer;
