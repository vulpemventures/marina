import React, { Dispatch, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { appReducer } from '../application/store/reducers';
import { AppContext } from '../application/background_script';
import Routes from './routes';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';
import { appInitialState } from '../application/store/reducers';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { App as AppDomain } from '../domain/app/app';
import { Wallet } from '../domain/wallet/wallet';
import { browser } from 'webextension-polyfill-ts';
import { IAppState } from '../domain/common';

const App: React.FC = () => {
  const [{appState, fetchedFromRepo}, setAppState] = useState({
    appState: (appInitialState as IAppState),
    fetchedFromRepo: false,
  });
  
  const app = new BrowserStorageAppRepo();
  const wallet = new BrowserStorageWalletRepo();
  const repos = { app, wallet };

  useEffect(() => {
    (async (): Promise<void> => {
      console.log('fetched from repo already?',fetchedFromRepo);
      if (!fetchedFromRepo) {
        try {
          const state = await Promise.all([app.getApp(), wallet.getOrCreateWallet()]);
          setAppState({
            appState: {
              app: (state[0] ).props,
              wallets: [(state[1] ).props],
            },
            fetchedFromRepo: true,
          });
        } catch (ignore) {
          setAppState({ appState, fetchedFromRepo: true });
        }
      }
    })();
  });
  const [state, dispatch] = useThunkReducer<IAppState, unknown>(appReducer, appState, undefined, repos);

  return (
    <HashRouter hashType="noslash">
      <AppContext.Provider value={[state, dispatch]}>
        <Routes />
      </AppContext.Provider>
    </HashRouter>
  );
};

export default App;
