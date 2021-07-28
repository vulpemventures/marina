import React from 'react';
import { HashRouter } from 'react-router-dom';
import Routes from './routes';

const App: React.FC = () => {
  return (
    <HashRouter hashType="noslash">
      <Routes />
    </HashRouter>
  );
};

export default App;
