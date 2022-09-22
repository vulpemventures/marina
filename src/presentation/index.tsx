import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ProxyStore } from '../application/redux/proxyStore';
import { persistor } from '../application/redux/store';
import App from './app';
import * as Sentry from '@sentry/browser';

import './styles/index.css';
import './styles/fonts.css';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://2b7688ea928a414d8619f11e998a0aa3@app.glitchtip.com/1844',
  });
}

const store = new ProxyStore(); // proxy store

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
