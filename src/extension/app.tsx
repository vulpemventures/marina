import React from 'react';
import { HashRouter } from 'react-router-dom';
import { BackgroundPortProvider } from './context/background-port-context';
import { StorageProvider } from './context/storage-context';
import Routes from './routes';

const App: React.FC = () => {
  return (
    <BackgroundPortProvider>
      <StorageProvider>
        <HashRouter hashType="noslash">
          <Routes />
        </HashRouter>
      </StorageProvider>
    </BackgroundPortProvider>
  );
};

export default App;
