import { AccountID, MainAccountID, MnemonicAccountData } from './account';
import { PasswordHash } from './password-hash';
import { UtxosAndTxsByNetwork } from './transaction';

export interface WalletState {
  [MainAccountID]: MnemonicAccountData;
  unspentsAndTransactions: Record<AccountID, UtxosAndTxsByNetwork>;
  passwordHash: PasswordHash;
  deepRestorer: {
    gapLimit: number;
    isLoading: boolean;
    error?: string;
  };
  updaterLoaders: number;
  isVerified: boolean;
  lockedUtxos: Record<string, number>;
}
