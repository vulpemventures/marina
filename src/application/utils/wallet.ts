import { PasswordHash } from './../../domain/wallet/value-objects/password-hash';
import { MasterXPub } from './../../domain/wallet/value-objects/master-extended-pub';
import { EncryptedMnemonic } from './../../domain/wallet/value-objects/encrypted-mnemonic';
import { Address } from './../../domain/wallet/value-objects/address';
import { MasterBlindingKey, Mnemonic as Mnemo, Password } from '../../domain/wallet/value-objects';
import { Mnemonic, IdentityType } from 'ldk';
import { encrypt, hash } from './crypto';
import { NetworkValue } from '../../domain/app/value-objects';

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
  chain: NetworkValue,
): WalletData {
  const mnemonicWallet = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    value: { mnemonic: mnemonic.value },
  });

  const masterXPub = MasterXPub.create(mnemonicWallet.masterPublicKey);
  const masterBlindingKey = MasterBlindingKey.create(mnemonicWallet.masterBlindingKey);
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