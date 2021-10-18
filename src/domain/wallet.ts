import { AccountID, MnemonicAccountData } from './account';
import { IError } from './common';
import { PasswordHash } from './password-hash';
import { UtxosAndTxsHistory } from './transaction';

export interface IWallet {
  mainAccount: MnemonicAccountData;
  unspentsAndTransactions: Record<AccountID, UtxosAndTxsHistory>;
  errors?: Record<string, IError>;
  passwordHash: PasswordHash;
  deepRestorer: {
    gapLimit: number;
    isLoading: boolean;
    error?: string;
  };
  isVerified: boolean;
}
