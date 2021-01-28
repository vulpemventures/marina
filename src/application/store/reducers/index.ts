import combineReducers from 'react-combine-reducers';
import { walletReducer } from './wallet-reducer';
import { appReducer as reducer } from './app-reducer';
import { IWallet } from '../../../domain/wallet/wallet';
import { IApp } from '../../../domain/app/app';
import { Network } from '../../../domain/app/value-objects/network';
import { onboardingReducer, onboardingInitState } from './onboarding-reducer';

export const walletInitState: IWallet[] = [];

export const appInitState: IApp = {
  isOnboardingCompleted: false,
  isAuthenticated: false,
  isWalletVerified: false,
  network: Network.create('regtest'), // TODO: default to liquid in prod
};

const [appReducer, appInitialState] = combineReducers({
  wallets: [walletReducer, walletInitState],
  app: [reducer, appInitState],
  onboarding: [onboardingReducer, onboardingInitState],
});

export { appReducer, appInitialState };
