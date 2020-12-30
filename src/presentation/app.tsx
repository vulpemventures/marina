import React from 'react';
import { HashRouter } from 'react-router-dom';
import { appInitialState, appReducer } from '../application/store/reducers';
import { AppContext } from '../application/background_script';
import Routes from './routes';
import useThunkReducer from '../application/store/reducers/use-thunk-reducer';

const App: React.FC = () => {
  const [state, dispatch] = useThunkReducer(appReducer, appInitialState);

  return (
    <HashRouter hashType="noslash">
      <AppContext.Provider value={[state, dispatch]}>
        <Routes />
      </AppContext.Provider>
    </HashRouter>
  );
};

export default App;
