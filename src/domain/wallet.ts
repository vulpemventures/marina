import { UtxoInterface } from 'ldk';
import { MnemonicAccountData } from './account';
import { IError } from './common';
import { PasswordHash } from './password-hash';

export interface IWallet {
  mainAccount: MnemonicAccountData;
  errors?: Record<string, IError>;
  passwordHash: PasswordHash;
  utxoMap: Record<string, UtxoInterface>;
  deepRestorer: {
    gapLimit: number;
    isLoading: boolean;
    error?: string;
  };
  isVerified: boolean;
}
