import { createMasterXPub, MasterXPub } from '../../domain/master-extended-pub';
import { EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { Address } from '../../domain/address';
import { Mnemonic, IdentityType } from 'ldk';
import { encrypt, hash } from './crypto';
import { Network } from '../../domain/network';
import { PasswordHash } from '../../domain/password-hash';
import { Mnemonic as Mnemo } from '../../domain/mnemonic';
import { createMasterBlindingKey, MasterBlindingKey } from '../../domain/master-blinding-key';
import { Password } from '../../domain/password';

export interface WalletData {
  confidentialAddresses: Address[];
  encryptedMnemonic: EncryptedMnemonic;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
}

export function createWalletFromMnemonic(
  password: Password,
  mnemonic: Mnemo,
  chain: Network,
): WalletData {
  const mnemonicWallet = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    value: { mnemonic },
  });

  const masterXPub = createMasterXPub(mnemonicWallet.masterPublicKey);
  const masterBlindingKey = createMasterBlindingKey(mnemonicWallet.masterBlindingKey);
  const encryptedMnemonic = encrypt(mnemonic, password);
  const passwordHash = hash(password);
  const confidentialAddresses: Address[] = [];

  // Update React state
  return {
    confidentialAddresses,
    encryptedMnemonic,
    masterXPub,
    masterBlindingKey,
    passwordHash,
  }
}