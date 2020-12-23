import React from 'react';
import { appInitialState } from './store/reducers';
import { browser } from 'webextension-polyfill-ts';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/onboarding/routes/constants';
import { IWallet } from '../domain/wallet/wallet';
import { IPreferences } from '../domain/preferences/preferences';

/**
 * Fired when the extension is first installed, when the extension is updated to a new version,
 * and when the browser is updated to a new version.
 * https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
 */
browser.runtime.onInstalled.addListener(({ reason, temporary }) => {
  // skip onboarding
  // if (temporary) return;
  switch (reason) {
    //On first install, open new tab for onboarding
    case 'install':
      {
        const url = browser.runtime.getURL(`onboarding.html#${INITIALIZE_WELCOME_ROUTE}`);
        browser.tabs
          .create({ url })
          .catch((err) => console.log(`Error in tab creation on install. ${err}`));
      }
      break;
    // TODO: on update, open new tab to tell users about the new features and any fixed issues
    // case 'update':
    //   {
    //     const url = browser.runtime.getURL('updated.html');
    //     browser.tabs.create({ url }).catch(console.log);
    //   }
    //   break;
  }
});

// Create store
//type appState = IWallets & IPreferences;
interface appState {
  wallets: IWallet[];
  prefs: IPreferences;
}
type ctx = [appState, React.Dispatch<unknown>];
export const AppContext = React.createContext<ctx>(appInitialState);
