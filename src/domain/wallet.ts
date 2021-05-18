import { UtxoInterface } from 'ldk';
import { Address } from './address';
import { IError } from './common';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { PasswordHash } from './password-hash';
import { Transaction } from './transaction';

export interface IWallet {
  confidentialAddresses: Address[];
  encryptedMnemonic: EncryptedMnemonic;
  errors?: Record<string, IError>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
  pendingTx?: Transaction;
  restored?: boolean;
  utxoMap: Record<string, UtxoInterface>;
}

