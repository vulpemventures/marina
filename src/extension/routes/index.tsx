import React from 'react';
import { Switch, Route } from 'react-router';
import {
  CONNECT_ENABLE_ROUTE,
  CONNECT_SPEND_ROUTE,
  CONNECT_SIGN_PSET_ROUTE,
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
  RECEIVE_SELECT_ASSET_ROUTE,
  SEND_SELECT_ASSET_ROUTE,
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
  BACKUP_UNLOCK_ROUTE,
  SETTINGS_DEEP_RESTORER_ROUTE,
  RECEIVE_ADDRESS_ROUTE,
  SETTINGS_ACCOUNTS_ROUTE,
  CONNECT_CREATE_ACCOUNT,
  SETTINGS_EXPLORER_CUSTOM_ROUTE,
  SETTINGS_ACCOUNTS_RESTORE_IONIO_ROUTE,
} from './constants';

// Connect
import ConnectEnableView from '../popups/enable';
import ConnectSpend from '../popups/spend';
import ConnectSignTransaction from '../popups/sign-pset';
import ConnectSignMsg from '../popups/sign-msg';
import ConnectCreateAccount from '../popups/create-account';

// Onboarding
import Welcome from '../onboarding/welcome';
import SelectAction from '../onboarding/select-action';
import WalletRestore from '../onboarding/wallet-restore';
import WalletCreate from '../onboarding/wallet-create';
import BackUpUnlock from '../onboarding/backup-unlock';
// Wallet
import LogIn from '../wallet/log-in';
import PaymentError from '../wallet/send/payment-error';
// Settings
import SettingsMenuSecurity from '../settings/menu-security';
import SettingsMenuSettings from '../settings/menu-settings';
import SettingsMenuInfo from '../settings/menu-info';
import SettingsChangePassword from '../settings/change-password';
import SettingsCurrency from '../settings/currency';
import SettingsCredits from '../settings/credits';
import SettingsTerms from '../settings/terms';
import ReceiveView from '../wallet/receive';
import SeedReveal from '../onboarding/seed-reveal';
import SeedConfirm from '../onboarding/seed-confirm';
import EndOfFlowOnboarding from '../onboarding/end-of-flow';
import Home from '../wallet/home';
import Transactions from '../wallet/transactions';
import ReceiveSelectAsset from '../wallet/receive/receive-select-asset';
import SendSelectAsset from '../wallet/send/send-select-asset';
import AddressAmountView from '../wallet/send/address-amount';
import ChooseFeeView from '../wallet/send/choose-fee';
import Confirmation from '../wallet/send/confirmation';
import SendEndOfFlow from '../wallet/send/end-of-flow';
import PaymentSuccessView from '../wallet/send/payment-success';
import SettingsShowMnemonic from '../settings/show-mnemonic';
import SettingsExplorer from '../settings/explorer';
import SettingsExplorerCustom from '../settings/explorer-custom';
import SettingsNetworksView from '../settings/networks';
import SettingsDeepRestorer from '../settings/deep-restorer';
import SettingsAccounts from '../settings/accounts';
import SettingsAccountsRestoreIonio from '../settings/accounts-restore-ionio';

const Routes: React.FC = () => {
  return (
    <Switch>
      {/*Onboarding*/}
      <Route exact path={INITIALIZE_WELCOME_ROUTE} component={Welcome} />
      <Route exact path={INITIALIZE_SELECT_ACTION_ROUTE} component={SelectAction} />
      <Route exact path={INITIALIZE_CREATE_PASSWORD_ROUTE} component={WalletCreate} />
      <Route exact path={INITIALIZE_SEED_PHRASE_ROUTE} component={SeedReveal} />
      <Route exact path={INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE} component={SeedConfirm} />
      <Route exact path={INITIALIZE_END_OF_FLOW_ROUTE} component={EndOfFlowOnboarding} />
      <Route exact path={RESTORE_VAULT_ROUTE} component={WalletRestore} />
      <Route exact path={BACKUP_UNLOCK_ROUTE} component={BackUpUnlock} />

      {/*Wallet*/}
      <Route exact path={DEFAULT_ROUTE} component={Home} />
      <Route exact path={TRANSACTIONS_ROUTE} component={Transactions} />
      <Route exact path={RECEIVE_SELECT_ASSET_ROUTE} component={ReceiveSelectAsset} />
      <Route exact path={`${RECEIVE_ADDRESS_ROUTE}/:asset`} component={ReceiveView} />
      <Route exact path={SEND_SELECT_ASSET_ROUTE} component={SendSelectAsset} />
      <Route exact path={SEND_ADDRESS_AMOUNT_ROUTE} component={AddressAmountView} />
      <Route exact path={SEND_CHOOSE_FEE_ROUTE} component={ChooseFeeView} />
      <Route exact path={SEND_CONFIRMATION_ROUTE} component={Confirmation} />
      <Route exact path={SEND_END_OF_FLOW_ROUTE} component={SendEndOfFlow} />
      <Route exact path={SEND_PAYMENT_SUCCESS_ROUTE} component={PaymentSuccessView} />
      <Route exact path={SEND_PAYMENT_ERROR_ROUTE} component={PaymentError} />
      {/*Settings*/}
      <Route exact path={SETTINGS_MENU_SECURITY_ROUTE} component={SettingsMenuSecurity} />
      <Route exact path={SETTINGS_MENU_SETTINGS_ROUTE} component={SettingsMenuSettings} />
      <Route exact path={SETTINGS_MENU_INFO_ROUTE} component={SettingsMenuInfo} />
      <Route exact path={SETTINGS_SHOW_MNEMONIC_ROUTE} component={SettingsShowMnemonic} />
      <Route exact path={SETTINGS_CHANGE_PASSWORD_ROUTE} component={SettingsChangePassword} />
      <Route exact path={SETTINGS_CURRENCY_ROUTE} component={SettingsCurrency} />
      <Route exact path={SETTINGS_EXPLORER_ROUTE} component={SettingsExplorer} />
      <Route exact path={SETTINGS_EXPLORER_CUSTOM_ROUTE} component={SettingsExplorerCustom} />
      <Route exact path={SETTINGS_NETWORKS_ROUTE} component={SettingsNetworksView} />
      <Route exact path={SETTINGS_CREDITS_ROUTE} component={SettingsCredits} />
      <Route exact path={SETTINGS_DEEP_RESTORER_ROUTE} component={SettingsDeepRestorer} />
      <Route exact path={SETTINGS_ACCOUNTS_ROUTE} component={SettingsAccounts} />
      <Route
        exact
        path={SETTINGS_ACCOUNTS_RESTORE_IONIO_ROUTE}
        component={SettingsAccountsRestoreIonio}
      />
      <Route exact path={SETTINGS_TERMS_ROUTE} component={SettingsTerms} />
      {/*Login*/}
      <Route exact path={LOGIN_ROUTE} component={LogIn} />
      {/*Connect*/}
      <Route exact path={CONNECT_ENABLE_ROUTE} component={ConnectEnableView} />
      <Route exact path={CONNECT_SPEND_ROUTE} component={ConnectSpend} />
      <Route exact path={CONNECT_SIGN_PSET_ROUTE} component={ConnectSignTransaction} />
      <Route exact path={CONNECT_SIGN_MSG_ROUTE} component={ConnectSignMsg} />
      <Route exact path={CONNECT_CREATE_ACCOUNT} component={ConnectCreateAccount} />
    </Switch>
  );
};

export default Routes;
