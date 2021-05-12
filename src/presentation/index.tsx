import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { AnyAction } from 'redux';
import { Store } from 'webext-redux';
import { RootState } from '../application/store/store';
import App from './app';

const store = new Store<RootState, AnyAction>(); // proxy store

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
