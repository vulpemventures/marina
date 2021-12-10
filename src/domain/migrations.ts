import { UnblindedOutput, StateRestorerOpts } from "ldk";
import { createMigrate } from "redux-persist";
import { PersistedState } from "redux-persist/es/types";
import { EncryptedMnemonic } from "./encrypted-mnemonic";
import { MasterBlindingKey } from "./master-blinding-key";
import { MasterXPub } from "./master-extended-pub";
import { WalletState } from "./wallet";

// inspired by: https://gist.github.com/lafiosca/b7bbb569ae3fe5c1ce110bf71d7ee153

type WalletPersistedStateV2 = WalletState & Partial<PersistedState>; // the current version
type keysAddedInV2 = "unspentsAndTransactions" | "mainAccount";
type deletedInV2 = {
  encryptedMnemonic: EncryptedMnemonic;
  masterBlindingKey: MasterBlindingKey;
  masterXPub: MasterXPub;
  restorerOpts: StateRestorerOpts;
}
type WalletPersistedStateV1 = Omit<WalletPersistedStateV2, keysAddedInV2> & deletedInV2;

const walletMigrations = {
  2: (state: WalletPersistedStateV1): WalletPersistedStateV2 => { 
    return {
      mainAccount: {
        encryptedMnemonic: state.encryptedMnemonic,
        masterBlindingKey: state.masterBlindingKey,
        masterXPub: state.masterXPub,
        restorerOpts: state.restorerOpts,
      },
      deepRestorer: state.deepRestorer,
      passwordHash: state.passwordHash,
      unspentsAndTransactions: {
        mainAccount: {
          utxosMap: {}, // the user will need to refetch the unspents and transactions
          transactions: { liquid: {}, testnet: {}, regtest: {} },
        }
      },
      updaterLoaders: 0,
      isVerified: state.isVerified,
    };
  }
}

// `as any` is needed (redux-persist doesn't support generic types in createMigrate func)
export const walletMigrate = createMigrate(walletMigrations as any);