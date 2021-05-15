import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import { RootState } from '../application/redux/store';
import App from './app';

const store = new Store<RootState, AnyAction>(); // proxy store

export type ProxyStoreDispatch = (action: AnyAction) => Promise<void>;

store
  .ready() // wait for proxy store to connect to background Marina store
  .then(() => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
      document.getElementById('root')
    );
  })
  .catch(console.error);
