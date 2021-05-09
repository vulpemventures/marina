import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { ProtectedRoute } from './guards';
import {
  CONNECT_ENABLE_ROUTE,
  CONNECT_SPEND_ROUTE,
  CONNECT_SPEND_PSET_ROUTE,
  CONNECT_SIGN_MSG_ROUTE,
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
  SELECT_ASSET_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  SETTINGS_MENU_SECURITY_ROUTE,
  SETTINGS_MENU_SETTINGS_ROUTE,
  SETTINGS_MENU_INFO_ROUTE,
  SETTINGS_SHOW_MNEMONIC_ROUTE,
  SETTINGS_CHANGE_PASSWORD_ROUTE,
  SETTINGS_CURRENCY_ROUTE,
  SETTINGS_EXPLORER_ROUTE,
  SETTINGS_NETWORKS_ROUTE,
  SETTINGS_CREDITS_ROUTE,
  SETTINGS_TERMS_ROUTE,
  SEND_END_OF_FLOW_ROUTE,
  SEND_PAYMENT_SUCCESS_ROUTE,
  SEND_PAYMENT_ERROR_ROUTE,
} from './constants';

// Connect
import ConnectEnable from '../connect/enable';
import ConnectSpend from '../connect/spend';
import ConnectSpendPset from '../connect/spend-pset';
import ConnectSignMsg from '../connect/sign-msg';

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
import SelectAsset from '../wallet/send/select-asset';
import AddressAmount from '../wallet/send/address-amount';
import ChooseFee from '../wallet/send/choose-fee';
import Confirmation from '../wallet/send/confirmation';
import SendEndOfFlow from '../wallet/send/end-of-flow';
import PaymentSuccess from '../wallet/send/payment-success';
import PaymentError from '../wallet/send/payment-error';
// Settings
import SettingsMenuSecurity from '../settings/menu-security';
import SettingsMenuSettings from '../settings/menu-settings';
import SettingsMenuInfo from '../settings/menu-info';
import SettingsShowMnemonic from '../settings/show-mnemonic';
import SettingsChangePassword from '../settings/change-password';
import SettingsCurrency from '../settings/currency';
import SettingsExplorer from '../settings/explorer';
import SettingsNetworks from '../settings/networks';
import SettingsCredits from '../settings/credits';
import SettingsTerms from '../settings/terms';

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
      <ProtectedRoute exact path={SELECT_ASSET_ROUTE} comp={SelectAsset} />
      <ProtectedRoute exact path={SEND_ADDRESS_AMOUNT_ROUTE} comp={AddressAmount} />
      <ProtectedRoute exact path={SEND_CHOOSE_FEE_ROUTE} comp={ChooseFee} />
      <ProtectedRoute exact path={SEND_CONFIRMATION_ROUTE} comp={Confirmation} />
      <ProtectedRoute exact path={SEND_END_OF_FLOW_ROUTE} comp={SendEndOfFlow} />
      <ProtectedRoute exact path={SEND_PAYMENT_SUCCESS_ROUTE} comp={PaymentSuccess} />
      <ProtectedRoute exact path={SEND_PAYMENT_ERROR_ROUTE} comp={PaymentError} />
      {/*Settings*/}
      <ProtectedRoute exact path={SETTINGS_MENU_SECURITY_ROUTE} comp={SettingsMenuSecurity} />
      <ProtectedRoute exact path={SETTINGS_MENU_SETTINGS_ROUTE} comp={SettingsMenuSettings} />
      <ProtectedRoute exact path={SETTINGS_MENU_INFO_ROUTE} comp={SettingsMenuInfo} />
      <ProtectedRoute exact path={SETTINGS_SHOW_MNEMONIC_ROUTE} comp={SettingsShowMnemonic} />
      <ProtectedRoute exact path={SETTINGS_CHANGE_PASSWORD_ROUTE} comp={SettingsChangePassword} />
      <ProtectedRoute exact path={SETTINGS_CURRENCY_ROUTE} comp={SettingsCurrency} />
      <ProtectedRoute exact path={SETTINGS_EXPLORER_ROUTE} comp={SettingsExplorer} />
      <ProtectedRoute exact path={SETTINGS_NETWORKS_ROUTE} comp={SettingsNetworks} />
      <ProtectedRoute exact path={SETTINGS_CREDITS_ROUTE} comp={SettingsCredits} />
      <ProtectedRoute exact path={SETTINGS_TERMS_ROUTE} comp={SettingsTerms} />
      {/*Login*/}
      <Route exact path={LOGIN_ROUTE} component={LogIn} />
      {/*Connect*/}
      <Route exact path={CONNECT_ENABLE_ROUTE} component={ConnectEnable} />
      <Route exact path={CONNECT_SPEND_ROUTE} component={ConnectSpend} />
      <Route exact path={CONNECT_SPEND_PSET_ROUTE} component={ConnectSpendPset} />
      <Route exact path={CONNECT_SIGN_MSG_ROUTE} component={ConnectSignMsg} />
    </Switch>
  );
};

export default Routes;
