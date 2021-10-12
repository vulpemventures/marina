import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ProxyStore } from '../application/redux/proxyStore';
import { persistor } from '../application/redux/store';
import App from './app';

import './styles/index.css';
import './styles/fonts.css';
import MermaidLoader from './components/mermaid-loader';

const store = new ProxyStore(); // proxy store

store
  .ready() // wait for proxy store to connect to background Marina store
  .then(() => {
    render(
      <Provider store={store}>
        <PersistGate
          loading={<MermaidLoader className="flex items-center justify-center h-screen" />}
          persistor={persistor}
        >
          <App />
        </PersistGate>
      </Provider>,
      document.getElementById('root')
    );
  })
  .catch(console.error);
