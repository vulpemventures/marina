import type { StateRestorerOpts } from 'ldk';
import { createMigrate } from 'redux-persist';
import type { PersistedState } from 'redux-persist/es/types';
import { walletInitState } from '../application/redux/reducers/wallet-reducer';
import { AccountType, initialRestorerOpts, MainAccountID, MnemonicAccountData } from './account';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';
import type { WalletState } from './wallet';

// inspired by: https://gist.github.com/lafiosca/b7bbb569ae3fe5c1ce110bf71d7ee153
export type WalletPersistedStateV3 = WalletState & Partial<PersistedState>;
type keysAddedInV3 = 'encryptedMnemonic' | 'accounts';
type deletedInV3 = {
  [MainAccountID]: MnemonicAccountData;
};

export type WalletPersistedStateV2 = Omit<WalletPersistedStateV3, keysAddedInV3> & deletedInV3;
type keysAddedInV2 = 'unspentsAndTransactions' | 'mainAccount' | 'updaterLoaders';
type deletedInV2 = {
  encryptedMnemonic: EncryptedMnemonic;
  masterBlindingKey: MasterBlindingKey;
  masterXPub: MasterXPub;
  restorerOpts: StateRestorerOpts;
};

export type WalletPersistedStateV1 = Omit<WalletPersistedStateV2, keysAddedInV2> & deletedInV2;

export const walletMigrations = {
  3: (state: WalletPersistedStateV2): WalletPersistedStateV3 => ({
    ...state,
    encryptedMnemonic: state[MainAccountID].encryptedMnemonic,
    accounts: {
      [MainAccountID]: { ...state[MainAccountID], type: AccountType.SingleSigAccount },
    },
  }),
  2: (state: WalletPersistedStateV1): WalletPersistedStateV2 => {
    return {
      mainAccount: {
        type: AccountType.SingleSigAccount,
        encryptedMnemonic: state.encryptedMnemonic,
        masterBlindingKey: state.masterBlindingKey,
        masterXPub: state.masterXPub,
        restorerOpts: {
          liquid: initialRestorerOpts,
          testnet: initialRestorerOpts,
          regtest: initialRestorerOpts
        },
      },
      deepRestorer: state.deepRestorer,
      passwordHash: state.passwordHash,
      unspentsAndTransactions: {
        mainAccount: walletInitState.unspentsAndTransactions.mainAccount,
      },
      updaterLoaders: 0,
      isVerified: state.isVerified,
    };
  },
};

// `as any` is needed (redux-persist doesn't support generic types in createMigrate func)
export const walletMigrate = createMigrate(walletMigrations as any);
