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
  DEFAULT_ROUTE,
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

export default function App(): React.ReactElement {
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
      <Route exact path={DEFAULT_ROUTE} component={Home} />
    </Switch>
  );
}
