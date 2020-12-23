import React from 'react';
import { Switch, Route } from 'react-router-dom';
import {
  INITIALIZE_WELCOME_ROUTE,
  INITIALIZE_SELECT_ACTION_ROUTE,
  INITIALIZE_CREATE_PASSWORD_ROUTE,
  RESTORE_VAULT_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
  INITIALIZE_SEED_PHRASE_ROUTE,
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
} from './constants';
import Welcome from '../welcome';
import SelectAction from '../select-action';
import WalletRestore from '../wallet-restore';
import WalletCreate from '../wallet-create';
import EndOfFlow from '../end-of-flow';
import SeedReveal from '../seed-reveal';
import SeedConfirm from '../seed-confirm';
//import AppProvider from '../../providers/app';

export default function App(): React.ReactElement {
  return (
    <Switch>
      {/* <Route
        exact
        path={INITIALIZE_WELCOME_ROUTE}
        render={(props) => (
          <AppProvider>
            <Welcome {...props} />
          </AppProvider>
        )}
      /> */}
      <Route exact path={INITIALIZE_WELCOME_ROUTE} component={Welcome} />
      <Route exact path={INITIALIZE_SELECT_ACTION_ROUTE} component={SelectAction} />
      <Route exact path={RESTORE_VAULT_ROUTE} component={WalletRestore} />
      <Route exact path={INITIALIZE_CREATE_PASSWORD_ROUTE} component={WalletCreate} />
      <Route exact path={INITIALIZE_SEED_PHRASE_ROUTE} component={SeedReveal} />
      <Route exact path={INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE} component={SeedConfirm} />
      <Route exact path={INITIALIZE_END_OF_FLOW_ROUTE} component={EndOfFlow} />
    </Switch>
  );
}
