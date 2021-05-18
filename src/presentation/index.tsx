import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { AnyAction } from 'redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Store } from 'webext-redux';
import { persistor } from '../application/redux/store';
import { RootReducerState } from '../domain/common';
import App from './app';

const store = new Store<RootReducerState, AnyAction>(); // proxy store

export type ProxyStoreDispatch = (action: AnyAction) => Promise<void>;

store
  .ready() // wait for proxy store to connect to background Marina store
  .then(() => {
    render(
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>,
      document.getElementById('root')
    );
  })
  .catch(console.error);
