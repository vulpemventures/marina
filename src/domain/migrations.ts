import type { StateRestorerOpts } from 'ldk';
import { createMigrate } from 'redux-persist';
import type { PersistedState } from 'redux-persist/es/types';
import { walletInitState } from '../application/redux/reducers/wallet-reducer';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';
import type { WalletState } from './wallet';

// inspired by: https://gist.github.com/lafiosca/b7bbb569ae3fe5c1ce110bf71d7ee153

export type WalletPersistedStateV2 = WalletState & Partial<PersistedState>; // the current version
type keysAddedInV2 = 'unspentsAndTransactions' | 'mainAccount' | 'updaterLoaders';
type deletedInV2 = {
  encryptedMnemonic: EncryptedMnemonic;
  masterBlindingKey: MasterBlindingKey;
  masterXPub: MasterXPub;
  restorerOpts: StateRestorerOpts;
};
export type WalletPersistedStateV1 = Omit<WalletPersistedStateV2, keysAddedInV2> & deletedInV2;

export const walletMigrations = {
  2: (state: WalletPersistedStateV1): WalletPersistedStateV2 => {
    return {
      mainAccount: {
        encryptedMnemonic: state.encryptedMnemonic,
        masterBlindingKey: state.masterBlindingKey,
        masterXPub: state.masterXPub,
        restorerOpts: walletInitState.mainAccount.restorerOpts,
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
