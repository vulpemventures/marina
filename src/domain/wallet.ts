import { XPub } from 'ldk';
import { AccountID, MnemonicAccountData, MultisigAccountData } from './account';
import { PasswordHash } from './password-hash';
import { UtxosAndTxsHistory } from './transaction';

export interface WalletState {
  mainAccount: MnemonicAccountData;
  restrictedAssetAccounts: Record<XPub, MultisigAccountData<CosignerExtraData>>,
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