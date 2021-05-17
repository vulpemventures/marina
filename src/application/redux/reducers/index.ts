import { assetReducer } from './asset-reducer';
import { onboardingReducer } from './onboarding-reducer';
import { walletReducer } from './wallet-reducer';
import { transactionReducer } from './transaction-reducer';
import { txsHistoryReducer } from './txs-history-reducer';
import { combineReducers } from 'redux';
import { appReducer } from './app-reducer';
import { connectDataReducer } from './connect-data-reducer';

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
//     network: Network.create((process.env.NETWORK || 'liquid') as NetworkValue),
//   };
// }

// const localStorageConfig = {
//   key: 'localStorage',
//   storage: localStorage,
// }

const marinaReducer = combineReducers({
  app: appReducer,
  assets: assetReducer,
  onboarding: onboardingReducer,
  transaction: transactionReducer,
  txsHistory: txsHistoryReducer,
  wallets: walletReducer,
  connect: connectDataReducer,
});

export default marinaReducer;
