import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { ProtectedRoute } from './guards';
import {
  INITIALIZE_WELCOME_ROUTE,
  INITIALIZE_SELECT_ACTION_ROUTE,
  INITIALIZE_CREATE_PASSWORD_ROUTE,
  RESTORE_VAULT_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
  INITIALIZE_SEED_PHRASE_ROUTE,
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  DEFAULT_ROUTE,
  LOGIN_ROUTE,
  TRANSACTIONS_ROUTE,
  RECEIVE_ROUTE,
} from './constants';

// Onboarding
import Welcome from '../onboarding/welcome';
import SelectAction from '../onboarding/select-action';
import WalletRestore from '../onboarding/wallet-restore';
import WalletCreate from '../onboarding/wallet-create';
import EndOfFlow from '../onboarding/end-of-flow';
import SeedReveal from '../onboarding/seed-reveal';
import SeedConfirm from '../onboarding/seed-confirm';
// Wallet
import Home from '../wallet/home';
import LogIn from '../wallet/log-in';
import Transactions from '../wallet/transactions';
import Receive from '../wallet/receive';

const Routes: React.FC = () => {
  return (
    <Switch>
      {/*Onboarding*/}
      <Route exact path={INITIALIZE_WELCOME_ROUTE} component={Welcome} />
      <Route exact path={INITIALIZE_SELECT_ACTION_ROUTE} component={SelectAction} />
      <Route exact path={RESTORE_VAULT_ROUTE} component={WalletRestore} />
      <Route exact path={INITIALIZE_CREATE_PASSWORD_ROUTE} component={WalletCreate} />
      <Route exact path={INITIALIZE_SEED_PHRASE_ROUTE} component={SeedReveal} />
      <Route exact path={INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE} component={SeedConfirm} />
      <Route exact path={INITIALIZE_END_OF_FLOW_ROUTE} component={EndOfFlow} />
      {/*Wallet*/}
      <ProtectedRoute exact path={DEFAULT_ROUTE} comp={Home} />
      <ProtectedRoute exact path={TRANSACTIONS_ROUTE} comp={Transactions} />
      <ProtectedRoute exact path={RECEIVE_ROUTE} comp={Receive} />
      <Route exact path={LOGIN_ROUTE} component={LogIn} />
    </Switch>
  );
};

export default Routes;
