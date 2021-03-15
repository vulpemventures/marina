import combineReducers from 'react-combine-reducers';
import { appReducer as reducer } from './app-reducer';
import { assetInitState, assetReducer } from './asset-reducer';
import { onboardingReducer, onboardingInitState } from './onboarding-reducer';
import { walletReducer } from './wallet-reducer';
import { IWallet } from '../../../domain/wallet/wallet';
import { IApp } from '../../../domain/app/app';
import { transactionInitState, transactionReducer } from './transaction-reducer';
import { txsHistoryInitState, txsHistoryReducer } from './txs-history-reducer';
import { Network } from '../../../domain/app/value-objects';
import { devAppInitState, devWalletInitState } from '../../../../test/fixtures/initial-dev-state';

export let walletInitState: IWallet[];
export let appInitState: IApp;

if (process.env.SKIP_ONBOARDING) {
  walletInitState = [devWalletInitState];
  appInitState = devAppInitState;
} else {
  walletInitState = [];
  appInitState = {
    isOnboardingCompleted: false,
    isAuthenticated: false,
    isWalletVerified: false,
    network: Network.create('regtest'),
  };
}

const [appReducer, appInitialState] = combineReducers({
  app: [reducer, appInitState],
  assets: [assetReducer, assetInitState],
  onboarding: [onboardingReducer, onboardingInitState],
  transaction: [transactionReducer, transactionInitState],
  txsHistory: [txsHistoryReducer, txsHistoryInitState],
  wallets: [walletReducer, walletInitState],
});

export { appReducer, appInitialState };
