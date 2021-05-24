import { assetReducer } from './asset-reducer';
import { onboardingReducer } from './onboarding-reducer';
import { walletReducer } from './wallet-reducer';
import { transactionReducer, TransactionState } from './transaction-reducer';
import { txsHistoryReducer } from './txs-history-reducer';
import { AnyAction, combineReducers, Reducer } from 'redux';
import { appReducer } from './app-reducer';
import { connectDataReducer } from './connect-data-reducer';
import { Storage } from 'redux-persist';
import { parse, stringify } from '../../utils/browser-storage-converters';
import { browser } from 'webextension-polyfill-ts';
import persistReducer from 'redux-persist/es/persistReducer';
import { IApp } from '../../../domain/app';
import { TxsHistoryByNetwork } from '../../../domain/transaction';
import { AssetsByNetwork } from '../../../domain/assets';
import { IWallet } from '../../../domain/wallet';
import { taxiReducer, TaxiState } from './taxi-reducer';
import { ConnectData } from '../../../domain/connect';

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

const localStorageConfig = (key: string, whitelist?: string[]) => ({
  key,
  storage: browserLocalStorage,
  version: 0,
  whitelist,
});

const persist = (reducer: Reducer, key: string, whitelist?: string[]): Reducer =>
  persistReducer(localStorageConfig(key, whitelist), reducer);

const marinaReducer = combineReducers({
  app: persist(appReducer, 'app') as Reducer<IApp, AnyAction>,
  assets: persist(assetReducer, 'assets') as Reducer<AssetsByNetwork, AnyAction>,
  onboarding: onboardingReducer,
  transaction: persist(transactionReducer, 'transaction') as Reducer<TransactionState, AnyAction>,
  txsHistory: persist(txsHistoryReducer, 'txsHistory') as Reducer<TxsHistoryByNetwork, AnyAction>,
  wallet: persist(walletReducer, 'wallet') as Reducer<IWallet, AnyAction>,
  taxi: persist(taxiReducer, 'taxi') as Reducer<TaxiState, AnyAction>,
  connect: persist(connectDataReducer, 'connect', ['enabledSites']) as Reducer<
    ConnectData,
    AnyAction
  >,
});

export default marinaReducer;
