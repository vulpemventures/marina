import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { appReducer, appInitialState } from '../application/store/reducers';
import { AppContext } from '../application/store/context';
import Routes from './routes';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';
import { BrowserStorageAppRepo } from '../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageAssetsRepo } from '../infrastructure/assets/browser-storage-assets-repository';
import { BrowserStorageTxsHistoryRepo } from '../infrastructure/txs-history/browser-storage-txs-history-repository';
import { BrowserStorageWalletRepo } from '../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { initApp, initTxsHistoryByNetwork, initWallet } from '../application/store/actions';
import { initAssets } from '../application/store/actions/assets';
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
  const marinaLoaderRef = React.useRef(null);
  useLottieLoader(marinaLoaderRef);

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
  });

  if (!fetchedFromRepo) {
    return (
      <div
        className="flex items-center justify-center h-screen p-8"
        id="marina-loader"
        ref={marinaLoaderRef}
      />
    );
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
