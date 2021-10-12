import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ProxyStore } from '../application/redux/proxyStore';
import { persistor } from '../application/redux/store';
import App from './app';

import './styles/index.css';
import './styles/fonts.css';
import PopupMermaidLoader from './components/popup-mermaid-loader';

const store = new ProxyStore(); // proxy store

store
  .ready() // wait for proxy store to connect to background Marina store
  .then(() => {
    render(
      <Provider store={store}>
        <PersistGate loading={<PopupMermaidLoader />} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>,
      document.getElementById('root')
    );
  })
  .catch(console.error);
