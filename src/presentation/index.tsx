import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import thunkMiddleware from 'redux-thunk';
import { AnyAction } from 'redux';
import { applyMiddleware, Store } from 'webext-redux';
import { RootState } from '../application/redux/store';
import App from './app';

const store = new Store<RootState, AnyAction>(); // proxy store
const storeWithMiddleware = applyMiddleware(store, thunkMiddleware);

export type ProxyStoreDispatch = typeof storeWithMiddleware.dispatch;

storeWithMiddleware
  .ready() // wait for proxy store to connect to background Marina store
  .then(() => {
    render(
      <Provider store={storeWithMiddleware}>
        <App />
      </Provider>,
      document.getElementById('root')
    );
  })
  .catch(console.error);
