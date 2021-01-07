import combineReducers from 'react-combine-reducers';
import { walletReducer } from './wallet-reducer';
import { preferencesReducer } from './preferences-reducer';
import { IWallet } from '../../../domain/wallet/wallet';
import { IPreferences } from '../../../domain/preferences/preferences';

const walletInitState: IWallet[] = [];

const preferencesInitState: IPreferences = {
  isOnboardingCompleted: false,
  isAuthenticated: false,
};

const [appReducer, appInitialState] = combineReducers({
  wallets: [walletReducer, walletInitState],
  prefs: [preferencesReducer, preferencesInitState],
});

export { appReducer, appInitialState };
