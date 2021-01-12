import combineReducers from 'react-combine-reducers';
import { walletReducer } from './wallet-reducer';
import { appReducer as reducer } from './app-reducer';
import { IWallet } from '../../../domain/wallet/wallet';
import { IApp } from '../../../domain/app/app';

const walletInitState: IWallet[] = [];

const appInitState: IApp = {
  isOnboardingCompleted: false,
  isAuthenticated: false,
  isWalletVerified: false,
};

const [appReducer, appInitialState] = combineReducers({
  wallets: [walletReducer, walletInitState],
  app: [reducer, appInitState],
});

export { appReducer, appInitialState };
