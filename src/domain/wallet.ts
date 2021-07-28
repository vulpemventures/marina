import { UtxoInterface, StateRestorerOpts } from 'ldk';
import { IError } from './common';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { PasswordHash } from './password-hash';

export interface IWallet {
  encryptedMnemonic: EncryptedMnemonic;
  errors?: Record<string, IError>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
  utxoMap: Record<string, UtxoInterface>;
  restorerOpts: StateRestorerOpts;
  deepRestorer: {
    gapLimit: number;
    isLoading: boolean;
    error?: string;
  };
  isVerified: boolean;
}
