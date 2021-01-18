import React from 'react';
import { appInitialState, appInitState, walletInitState } from './store/reducers';
import { browser } from 'webextension-polyfill-ts';
import { INITIALIZE_WELCOME_ROUTE } from '../presentation/routes/constants';
import { IAppState } from '../domain/common';
import { IAppRepository } from '../domain/app/i-app-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';
import { App } from '../domain/app/app';
import { IWallet, Wallet } from '../domain/wallet/wallet';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';

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
        const repos = {
          app: new BrowserStorageAppRepo(),
          wallet: new BrowserStorageWalletRepo(),
        };
        const url = browser.runtime.getURL(`home.html#${INITIALIZE_WELCOME_ROUTE}`);

        initPersistentStore(repos)
          .then(() => browser.tabs.create({ url }))
          .catch((err) => console.log(err));
        
        break;
      }
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
type ctx = [IAppState, React.Dispatch<unknown>];
export const AppContext = React.createContext<ctx>(appInitialState);

async function initPersistentStore(repos: {
  app: IAppRepository;
  wallet: IWalletRepository;
}): Promise<void> {
  const app = App.createApp(appInitState);
  const wallets = walletInitState.map((w: IWallet) => Wallet.createWallet(w));
  await Promise.all([repos.app.init(app), repos.wallet.init(wallets)]);
}
