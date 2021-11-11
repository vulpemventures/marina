import { PopupName } from '../../domain/message';

// Connect
const makeConnectRoute = (popupName: PopupName) => `/connect/${popupName}`;

const CONNECT_ENABLE_ROUTE = makeConnectRoute('enable');
const CONNECT_SPEND_ROUTE = makeConnectRoute('spend');
const CONNECT_SIGN_PSET_ROUTE = makeConnectRoute('sign-pset');
const CONNECT_SIGN_MSG_ROUTE = makeConnectRoute('sign-msg');
const CONNECT_ALLOW_COIN_ROUTE = makeConnectRoute('allow-coin');

// Onboarding
const INITIALIZE_WELCOME_ROUTE = '/initialize/welcome';
const INITIALIZE_CREATE_PASSWORD_ROUTE = '/initialize/create-password';
const INITIALIZE_SELECT_ACTION_ROUTE = '/initialize/select-action';
const INITIALIZE_SEED_PHRASE_ROUTE = '/initialize/seed-phrase';
const INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE = '/initialize/seed-phrase/confirm';
const INITIALIZE_END_OF_FLOW_ROUTE = '/initialize/end-of-flow';

// During first onboarding or accessed from popup anytime
const RESTORE_VAULT_ROUTE = '/restore-vault';
//
const BACKUP_UNLOCK_ROUTE = '/backup-unlock';

// Wallet
const LOGIN_ROUTE = '/login';
const DEFAULT_ROUTE = '/';
const TRANSACTIONS_ROUTE = '/transactions';
const RECEIVE_SELECT_ASSET_ROUTE = '/receive/select-asset';
const RECEIVE_ADDRESS_ROUTE = '/receive/address';
const SEND_SELECT_ASSET_ROUTE = '/send/select-asset';
const SEND_ADDRESS_AMOUNT_ROUTE = '/send';
const SEND_CHOOSE_FEE_ROUTE = '/send/choose-fee';
const SEND_CONFIRMATION_ROUTE = '/send/confirmation';
const SEND_END_OF_FLOW_ROUTE = '/send/end-of-flow';
const SEND_PAYMENT_SUCCESS_ROUTE = '/send/payment-success';
const SEND_PAYMENT_ERROR_ROUTE = '/send/payment-error';

// Settings
const SETTINGS_MENU_SECURITY_ROUTE = '/settings/security';
const SETTINGS_SHOW_MNEMONIC_ROUTE = '/settings/security/show-mnemonic';
const SETTINGS_CHANGE_PASSWORD_ROUTE = '/settings/security/change-password';
//
const SETTINGS_MENU_SETTINGS_ROUTE = '/settings/settings';
const SETTINGS_CURRENCY_ROUTE = '/settings/settings/currency';
const SETTINGS_EXPLORER_ROUTE = '/settings/settings/explorer';
const SETTINGS_NETWORKS_ROUTE = '/settings/settings/networks';
//
const SETTINGS_MENU_INFO_ROUTE = '/settings/info';
const SETTINGS_CREDITS_ROUTE = '/settings/info/credits';
const SETTINGS_TERMS_ROUTE = '/settings/info/terms-of-service';
const SETTINGS_DEEP_RESTORER_ROUTE = '/settings/info/deep-restorer';
const SETTINGS_COSIGNERS_ROUTE = '/settings/info/cosigners';

// Cosigner Opt in
const PAIR_COSIGNER_ROUTE = '/cosigner/pair';
const PAIR_SUCCESS_COSIGNER_ROUTE = '/cosigner/pair/success';

export {
  //Connect
  CONNECT_ENABLE_ROUTE,
  CONNECT_SPEND_ROUTE,
  CONNECT_SIGN_PSET_ROUTE,
  CONNECT_SIGN_MSG_ROUTE,
  CONNECT_ALLOW_COIN_ROUTE,
  // Onboarding
  INITIALIZE_WELCOME_ROUTE,
  INITIALIZE_CREATE_PASSWORD_ROUTE,
  INITIALIZE_SELECT_ACTION_ROUTE,
  INITIALIZE_SEED_PHRASE_ROUTE,
  INITIALIZE_CONFIRM_SEED_PHRASE_ROUTE,
  INITIALIZE_END_OF_FLOW_ROUTE,
  RESTORE_VAULT_ROUTE,
  BACKUP_UNLOCK_ROUTE,
  // Wallet
  LOGIN_ROUTE,
  DEFAULT_ROUTE,
  TRANSACTIONS_ROUTE,
  RECEIVE_SELECT_ASSET_ROUTE,
  RECEIVE_ADDRESS_ROUTE,
  SEND_SELECT_ASSET_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  SEND_END_OF_FLOW_ROUTE,
  SEND_PAYMENT_SUCCESS_ROUTE,
  SEND_PAYMENT_ERROR_ROUTE,
  // Settings
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
  SETTINGS_DEEP_RESTORER_ROUTE,
  SETTINGS_COSIGNERS_ROUTE,
  PAIR_COSIGNER_ROUTE,
  PAIR_SUCCESS_COSIGNER_ROUTE,
};
