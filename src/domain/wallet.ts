import type { AccountData, AccountID } from './account';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { PasswordHash } from './password-hash';
import type { MapByNetwork, TxsHistory, UtxosMap } from './transaction';

export interface WalletState {
  encryptedMnemonic: EncryptedMnemonic;
  accounts: {
    [id: AccountID]: AccountData;
  };
  passwordHash: PasswordHash;
  deepRestorer: {
    gapLimit: number;
    restorerLoaders: number;
    error?: string;
  };
  updaterLoaders: number;
  isVerified: boolean;
}

export interface UtxosTransactionsState {
  utxos: MapByNetwork<Record<AccountID, Record<string, UtxosMap>>>;
  transactions: MapByNetwork<Record<AccountID, TxsHistory>>;
  lockedUtxos: Record<string, number>;
}
