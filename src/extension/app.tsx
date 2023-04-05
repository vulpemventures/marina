import React from 'react';
import { HashRouter } from 'react-router-dom';
import Toasts from './components/toasts';
import { BackgroundPortProvider } from './context/background-port-context';
import { StorageProvider } from './context/storage-context';
import { ToastProvider } from './context/toast-context';
import Routes from './routes';

const App: React.FC = () => {
  return (
    <BackgroundPortProvider>
      <StorageProvider>
        <ToastProvider>
          <Toasts />
          <HashRouter hashType="noslash">
            <Routes />
          </HashRouter>
        </ToastProvider>
      </StorageProvider>
    </BackgroundPortProvider>
  );
};

export default App;
