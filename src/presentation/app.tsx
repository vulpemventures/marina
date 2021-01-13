import React from 'react';
import { HashRouter } from 'react-router-dom';
import { appInitialState, appReducer } from '../application/store/reducers';
import { AppContext } from '../application/background_script';
import Routes from './routes';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';

import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';

const App: React.FC = () => {
  const repos = {
    app: new BrowserStorageAppRepo(),
    wallet: new BrowserStorageWalletRepo(),
  };

  const [state, dispatch] = useThunkReducer(appReducer, appInitialState, undefined, repos);

  return (
    <HashRouter hashType="noslash">
      <AppContext.Provider value={[state, dispatch]}>
        <Routes />
      </AppContext.Provider>
    </HashRouter>
  );
};

export default App;
