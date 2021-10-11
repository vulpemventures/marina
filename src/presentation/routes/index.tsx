import React, { Suspense } from 'react';
import { Switch, Route } from 'react-router-dom';
import { ProtectedRoute } from './guards';
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
} from './constants';
import MermaidLoader from '../components/mermaid-loader';

// Connect
const ConnectEnableView = React.lazy(() => import('../connect/enable'));
const ConnectSpend = React.lazy(() => import('../connect/spend'));
const ConnectSignTransaction = React.lazy(() => import('../connect/sign-pset'));
const ConnectSignMsg = React.lazy(() => import('../connect/sign-msg'));

// Onboarding
const Welcome = React.lazy(() => import('../onboarding/welcome'));
const SelectAction = React.lazy(() => import('../onboarding/select-action'));
const WalletRestore = React.lazy(() => import('../onboarding/wallet-restore'));
const WalletCreate = React.lazy(() => import('../onboarding/wallet-create'));
const EndOfFlow = React.lazy(
  () => import('../../application/redux/containers/end-of-flow-onboarding.container')
);
const SeedReveal = React.lazy(
  () => import('../../application/redux/containers/seed-reveal.container')
);
const SeedConfirm = React.lazy(
  () => import('../../application/redux/containers/seed-confirm.container')
);
const BackUpUnlock = React.lazy(() => import('../onboarding/backup-unlock'));
// Wallet
const Home = React.lazy(() => import('../../application/redux/containers/home.container'));
const LogIn = React.lazy(() => import('../wallet/log-in'));
const Transactions = React.lazy(
  () => import('../../application/redux/containers/transactions.container')
);
const ReceiveAddress = React.lazy(
  () => import('../../application/redux/containers/receive.container')
);
const ReceiveSelectAsset = React.lazy(
  () => import('../../application/redux/containers/receive-select-asset.container')
);
const SendSelectAsset = React.lazy(
  () => import('../../application/redux/containers/send-select-asset.container')
);
const AddressAmount = React.lazy(
  () => import('../../application/redux/containers/address-amount.container')
);
const ChooseFee = React.lazy(
  () => import('../../application/redux/containers/choose-fee.container')
);
const Confirmation = React.lazy(
  () => import('../../application/redux/containers/confirmation.container')
);
const SendEndOfFlow = React.lazy(
  () => import('../../application/redux/containers/end-of-flow.container')
);
const PaymentSuccess = React.lazy(
  () => import('../../application/redux/containers/payment-success.container')
);
const PaymentError = React.lazy(() => import('../wallet/send/payment-error'));
// Settings
const SettingsMenuSecurity = React.lazy(() => import('../settings/menu-security'));
const SettingsMenuSettings = React.lazy(() => import('../settings/menu-settings'));
const SettingsMenuInfo = React.lazy(() => import('../settings/menu-info'));
const SettingsShowMnemonic = React.lazy(
  () => import('../../application/redux/containers/settings-show-mnemonic.container')
);
const SettingsDeepRestorer = React.lazy(
  () => import('../../application/redux/containers/deep-restorer.container')
);
const SettingsChangePassword = React.lazy(() => import('../settings/change-password'));
const SettingsCurrency = React.lazy(() => import('../settings/currency'));
const SettingsExplorer = React.lazy(() => import('../settings/explorer'));
const SettingsNetworks = React.lazy(
  () => import('../../application/redux/containers/settings-networks.container')
);
const SettingsCredits = React.lazy(() => import('../settings/credits'));
const SettingsTerms = React.lazy(() => import('../settings/terms'));

const Routes: React.FC = () => {
  return (
    <Suspense
      fallback={<MermaidLoader className="flex items-center justify-center h-screen p-24" />}
    >
      <Switch>
        {/*Onboarding*/}
        <Route exact path={INITIALIZE_WELCOME_ROUTE} component={Welcome} />
        <Route exact path={INITIALIZE_SELECT_ACTION_ROUTE} component={SelectAction} />
        <Route exact path={INITIALIZE_CREATE_PASSWORD_ROUTE} component={WalletCreate} />
        <Route exact path={INITIALIZE_SEED_PHRASE_ROUTE} component={SeedReveal} />
        <Route exact path={INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE} component={SeedConfirm} />
        <Route exact path={INITIALIZE_END_OF_FLOW_ROUTE} component={EndOfFlow} />
        <Route exact path={RESTORE_VAULT_ROUTE} component={WalletRestore} />
        <Route exact path={BACKUP_UNLOCK_ROUTE} component={BackUpUnlock} />
        {/*Wallet*/}
        <ProtectedRoute exact path={DEFAULT_ROUTE} comp={Home} />
        <ProtectedRoute exact path={TRANSACTIONS_ROUTE} comp={Transactions} />
        <ProtectedRoute exact path={RECEIVE_SELECT_ASSET_ROUTE} comp={ReceiveSelectAsset} />
        <ProtectedRoute exact path={RECEIVE_ADDRESS_ROUTE} comp={ReceiveAddress} />
        <ProtectedRoute exact path={SEND_SELECT_ASSET_ROUTE} comp={SendSelectAsset} />
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
        <ProtectedRoute exact path={SETTINGS_DEEP_RESTORER_ROUTE} comp={SettingsDeepRestorer} />
        <Route exact path={SETTINGS_TERMS_ROUTE} component={SettingsTerms} />
        {/*Login*/}
        <Route exact path={LOGIN_ROUTE} component={LogIn} />
        {/*Connect*/}
        <Route exact path={CONNECT_ENABLE_ROUTE} component={ConnectEnableView} />
        <Route exact path={CONNECT_SPEND_ROUTE} component={ConnectSpend} />
        <Route exact path={CONNECT_SIGN_PSET_ROUTE} component={ConnectSignTransaction} />
        <Route exact path={CONNECT_SIGN_MSG_ROUTE} component={ConnectSignMsg} />
      </Switch>
    </Suspense>
  );
};

export default Routes;
