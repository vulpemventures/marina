import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { appReducer, appInitialState } from '../application/store/reducers';
import { AppContext } from '../application/background_script';
import Routes from './routes';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';

import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { initApp, initWallet } from '../application/store/actions';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  const app = new BrowserStorageAppRepo();
  const wallet = new BrowserStorageWalletRepo();
  const repos = { app, wallet };
  const [state, dispatch] = useThunkReducer(appReducer, appInitialState, undefined, repos);

  useEffect(() => {
    void (async (): Promise<void> => {
      if (isLoading) {
        try {
          const [appState, walletState] = await Promise.all([
            app.getApp(),
            wallet.getOrCreateWallet(),
          ]);
          dispatch(initApp(appState.props));
          dispatch(initWallet(walletState.props));
        } finally {
          setIsLoading(false);
        }
      }
    })();
  });

  // TODO: render something better.. like a spinner?
  if (isLoading) {
    return <div>Loading...</div>;
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
