import type { StateRestorerOpts} from 'ldk';
import { toXpub } from 'ldk';
import { createMigrate } from 'redux-persist';
import type { PersistedState } from 'redux-persist/es/types';
import { walletInitState } from '../application/redux/reducers/wallet-reducer';
import type { MnemonicAccountData } from './account';
import { AccountType, initialRestorerOpts, MainAccountID } from './account';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';
import type { WalletState } from './wallet';

// v6 ensures the reducer only have xpub (and not zpub etc..)
export type WalletPersistedStateV6 = WalletState & Partial<PersistedState>;

// v5 only erases the current transactions state for all accounts during migration
export type WalletPersistedStateV5 = WalletState & Partial<PersistedState>;

// v4 is a fixed version of v3 about covenantTemplate field in CustomAccountData
export type WalletPersistedStateV4 = WalletPersistedStateV5;

export type WalletPersistedStateV3 = WalletPersistedStateV4;
type keysAddedInV3 = 'encryptedMnemonic' | 'accounts';
type deletedInV3 = {
  [MainAccountID]: MnemonicAccountData;
};

export type WalletPersistedStateV2 = Omit<WalletPersistedStateV3, keysAddedInV3> & deletedInV3; // the current version
type keysAddedInV2 = 'unspentsAndTransactions' | 'mainAccount' | 'updaterLoaders' | 'lockedUtxos';
type deletedInV2 = {
  encryptedMnemonic: EncryptedMnemonic;
  masterBlindingKey: MasterBlindingKey;
  masterXPub: MasterXPub;
  restorerOpts: StateRestorerOpts;
};

export type WalletPersistedStateV1 = Omit<WalletPersistedStateV2, keysAddedInV2> & deletedInV2;

export const walletMigrations = {
  6: (state: WalletPersistedStateV5): WalletPersistedStateV6 => ({
    ...state,
    accounts: accountsFieldXPub(state.accounts),
  }),
  5: (state: WalletPersistedStateV4): WalletPersistedStateV5 => ({
    ...state,
    unspentsAndTransactions: removeTransactions(state.unspentsAndTransactions),
  }),
  4: (state: WalletPersistedStateV3) => ({
    ...state,
    accounts: accountsFieldRenameV4(state.accounts),
  }),
  3: (state: WalletPersistedStateV2): WalletPersistedStateV3 => ({
    ...state,
    encryptedMnemonic: state[MainAccountID].encryptedMnemonic,
    accounts: {
      [MainAccountID]: { ...state[MainAccountID], type: AccountType.MainAccount },
    },
  }),
  2: (state: WalletPersistedStateV1): WalletPersistedStateV2 => {
    return {
      mainAccount: {
        type: AccountType.MainAccount,
        encryptedMnemonic: state.encryptedMnemonic,
        masterBlindingKey: state.masterBlindingKey,
        masterXPub: state.masterXPub,
        restorerOpts: {
          liquid: initialRestorerOpts,
          testnet: initialRestorerOpts,
          regtest: initialRestorerOpts,
        },
      },
      deepRestorer: state.deepRestorer,
      passwordHash: state.passwordHash,
      unspentsAndTransactions: {
        mainAccount: walletInitState.unspentsAndTransactions.mainAccount,
      },
      updaterLoaders: 0,
      isVerified: state.isVerified,
      lockedUtxos: walletInitState.lockedUtxos,
    };
  },
};

function accountsFieldXPub(
  accounts: WalletPersistedStateV5['accounts']
): WalletPersistedStateV6['accounts'] {
  const withxpub: WalletPersistedStateV6['accounts'] = {};
  for (const [id, account] of Object.entries(accounts)) {
    withxpub[id] = {
      ...account,
      masterXPub: account.masterXPub.startsWith('xpub')
        ? account.masterXPub
        : toXpub(account.masterXPub),
    };
  }
  return withxpub;
}

function accountsFieldRenameV4(
  accounts: WalletPersistedStateV3['accounts']
): WalletPersistedStateV4['accounts'] {
  const renamed: WalletPersistedStateV4['accounts'] = {};
  for (const [id, account] of Object.entries(accounts)) {
    renamed[id] = {
      ...account,
      contractTemplate: account.covenantDescriptors || undefined,
    };
  }
  return renamed;
}

function removeTransactions(
  utxosAndTxs: WalletPersistedStateV4['unspentsAndTransactions']
): WalletPersistedStateV5['unspentsAndTransactions'] {
  const result: WalletPersistedStateV5['unspentsAndTransactions'] = {};
  for (const [accountID, utxosTxsByNetwork] of Object.entries(utxosAndTxs)) {
    result[accountID] = {
      liquid: { ...utxosTxsByNetwork.liquid, transactions: {} },
      testnet: { ...utxosTxsByNetwork.testnet, transactions: {} },
      regtest: { ...utxosTxsByNetwork.regtest, transactions: {} },
    };
  }
  return result;
}

// `as any` is needed (redux-persist doesn't support generic types in createMigrate func)
export const walletMigrate = createMigrate(walletMigrations as any);
