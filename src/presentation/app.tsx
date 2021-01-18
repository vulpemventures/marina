import React, { useEffect, useState } from 'react';
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
import { initApp, initWallet } from '../application/store/actions';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  const app = new BrowserStorageAppRepo();
  const wallet = new BrowserStorageWalletRepo();
  const repos = { app, wallet };
  const [state, dispatch] = useThunkReducer<IAppState, unknown>(appReducer, appInitialState, undefined, repos);

  useEffect(() => {
    (async (): Promise<void> => {
      if (isLoading) {
        try {
          const [appState, walletState] = await Promise.all([app.getApp(), wallet.getOrCreateWallet()]);
          dispatch(initApp(appState.props));
          dispatch(initWallet(walletState.props));
        } catch(ignore) {
        } finally {
          setIsLoading(false);
        }
      }
    })();
  });

  // TODO: render something better.. like a spinner?
  if (isLoading) {
    return (<div>Loading...</div>);
  }

  return (
    <HashRouter hashType="noslash">
      <AppContext.Provider value={[state, dispatch]}>
        <Routes />
      </AppContext.Provider>
    </HashRouter>
  );
};

export default App;
