import combineReducers from 'react-combine-reducers';
import { walletReducer } from './wallet-reducer';
import { preferencesReducer } from './preferences-reducer';
import { IWallet } from '../../../domain/wallet/wallet';
import { IPreferences } from '../../../domain/preferences/preferences';

const walletInitStateDev: IWallet[] = [
  {
    entropy: '182301471f6892728ae56bb95b54396e',
    mnemonic: [
      'glass',
      'snow',
      'rock',
      'kitchen',
      'black',
      'big',
      'yellow',
      'hand',
      'fog',
      'tree',
      'green',
      'window',
    ],
  },
];

const preferencesInitStateDev: IPreferences = {
  isOnboardingCompleted: false,
};

const [appReducer, appInitialState] = combineReducers({
  wallets: [walletReducer, walletInitStateDev],
  prefs: [preferencesReducer, preferencesInitStateDev],
});

export { appReducer, appInitialState };
