import type { AccountID, MainAccountID, MnemonicAccountData } from './account';
import type { PasswordHash } from './password-hash';
import type { UtxosAndTxsByNetwork } from './transaction';

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
}
