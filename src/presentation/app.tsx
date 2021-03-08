import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import Routes from './routes';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageAssetsRepo } from '../infrastructure/assets/browser-storage-assets-repository';
import { BrowserStorageTxsHistoryRepo } from '../infrastructure/txs-history/browser-storage-txs-history-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../application/store/reducers';
import { AppContext } from '../application/store/context';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';
import {
  initApp,
  initAssets,
  initTxsHistoryByNetwork,
  initWallet,
} from '../application/store/actions';
import useLottieLoader from './hooks/use-lottie-loader';

const App: React.FC = () => {
  const [fetchedFromRepo, setFetchedFromRepo] = useState(false);

  const app = new BrowserStorageAppRepo();
  const assets = new BrowserStorageAssetsRepo();
  const txsHistory = new BrowserStorageTxsHistoryRepo();
  const wallet = new BrowserStorageWalletRepo();
  const repos = { app, assets, txsHistory, wallet };
  const [state, dispatch] = useThunkReducer(appReducer, appInitialState, repos);

  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  useEffect(() => {
    void (async (): Promise<void> => {
      if (!fetchedFromRepo) {
        try {
          const [appState, assetState, txsHistoryState, walletState] = await Promise.all([
            app.getApp(),
            assets.getAssets(),
            txsHistory.getTxsHistoryByNetwork(),
            wallet.getOrCreateWallet(),
          ]);
          dispatch(initApp(appState.props));
          dispatch(initAssets(assetState));
          dispatch(initTxsHistoryByNetwork(txsHistoryState));
          dispatch(initWallet(walletState.props));
        } catch (error) {
          console.log(error);
        } finally {
          setFetchedFromRepo(true);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fetchedFromRepo) {
    return <div className="flex items-center justify-center h-screen p-8" ref={mermaidLoaderRef} />;
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
