import { assetReducer } from './asset-reducer';
import { onboardingReducer } from './onboarding-reducer';
import { walletReducer, WalletState } from './wallet-reducer';
import { transactionReducer } from './transaction-reducer';
import { txsHistoryReducer } from './txs-history-reducer';
import { combineReducers } from 'redux';
import { appReducer } from './app-reducer';
import { persistReducer } from 'redux-persist';
import { localStorage } from 'redux-persist-webextension-storage'
import { PersistConfig } from 'redux-persist/es/types';

// TODO : uncomment / remove 
// if (process.env.SKIP_ONBOARDING) {
//   walletInitState = [devWalletInitState];
//   appInitState = devAppInitState;
// } else {
//   walletInitState = [];
//   appInitState = {
//     isOnboardingCompleted: false,
//     isAuthenticated: false,
//     isWalletVerified: false,
//     network: Network.create((process.env.NETWORK || 'liquid') as Network['value']),
//   };
// }

const localStorageConfig = {
  key: 'localStorage',
  storage: localStorage,
}

const marinaReducer = combineReducers({
  app: persistReducer(localStorageConfig, appReducer),
  assets: assetReducer,
  onboarding: onboardingReducer,
  transaction: persistReducer(localStorageConfig, transactionReducer),
  txsHistory: persistReducer(localStorageConfig, txsHistoryReducer),
  wallets: persistReducer(localStorageConfig, walletReducer),
});

export default marinaReducer;
