import { AccountID, MainAccountID, MnemonicAccountData } from './account';
import { PasswordHash } from './password-hash';
import { UtxosAndTxsHistory } from './transaction';

export interface WalletState {
  [MainAccountID]: MnemonicAccountData;
  unspentsAndTransactions: Record<AccountID, UtxosAndTxsHistory>;
  passwordHash: PasswordHash;
  deepRestorer: {
    gapLimit: number;
    isLoading: boolean;
    error?: string;
  };
  isVerified: boolean;
}

export interface CosignerExtraData {
  cosignerURL: string;
}
