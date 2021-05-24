import { createMasterXPub, MasterXPub } from '../../domain/master-extended-pub';
import { EncryptedMnemonic } from '../../domain/encrypted-mnemonic';
import { Address, createAddress } from '../../domain/address';
import { Mnemonic, IdentityType, EsploraIdentityRestorer } from 'ldk';
import { encrypt, hash } from './crypto';
import { Network } from '../../domain/network';
import { PasswordHash } from '../../domain/password-hash';
import { Mnemonic as Mnemo } from '../../domain/mnemonic';
import { createMasterBlindingKey, MasterBlindingKey } from '../../domain/master-blinding-key';
import { Password } from '../../domain/password';
import { explorerApiUrl } from './constants';

export interface WalletData {
  confidentialAddresses: Address[];
  encryptedMnemonic: EncryptedMnemonic;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  passwordHash: PasswordHash;
}

export async function createWalletFromMnemonic(
  password: Password,
  mnemonic: Mnemo,
  chain: Network
): Promise<WalletData> {
  const mnemonicWallet = new Mnemonic({
    chain,
    type: IdentityType.Mnemonic,
    value: { mnemonic },
    restorer: new EsploraIdentityRestorer(explorerApiUrl[chain]),
    initializeFromRestorer: true,
  });

  await mnemonicWallet.isRestored;

  const masterXPub = createMasterXPub(mnemonicWallet.masterPublicKey);
  const masterBlindingKey = createMasterBlindingKey(mnemonicWallet.masterBlindingKey);
  const encryptedMnemonic = encrypt(mnemonic, password);
  const passwordHash = hash(password);
  const addresses = (await mnemonicWallet.getAddresses()).map((a) =>
    createAddress(a.confidentialAddress, a.derivationPath)
  );

  // Update React state
  return {
    confidentialAddresses: addresses,
    encryptedMnemonic,
    masterXPub,
    masterBlindingKey,
    passwordHash,
  };
}
