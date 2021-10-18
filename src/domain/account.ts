import { IdentityInterface, MasterPublicKey, Mnemonic, Multisig, MultisigWatchOnly, StateRestorerOpts } from 'ldk';
import { decrypt } from '../application/utils';
import { restoredMasterPublicKey, restoredMnemonic } from '../application/utils/restorer';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { Network } from './network';

/**
 * Account domain represents the keys of the User
 * 
 * - each Account is a derived of master private key (computed from mnemonic).
 * - an Account returns two type of identities: a WatchOnly identity and a signing Identity (computed from user's password).
 * - 
 * 
 */

export interface Account<SignID extends IdentityInterface = IdentityInterface, WatchID extends IdentityInterface = IdentityInterface> {
  getSigningIdentity(password: string): Promise<SignID>;
  getWatchIdentity(): Promise<WatchID>;
  [propName: string]: any;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MainAccount = Account<Mnemonic, MasterPublicKey>;

export interface MnemonicAccountData {
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: StateRestorerOpts;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createMnemonicAccount(data: MnemonicAccountData, network: Network): MainAccount {
  return {
    getSigningIdentity: (password: string) =>
      restoredMnemonic(decrypt(data.encryptedMnemonic, password), data.restorerOpts, network),
    getWatchIdentity: () =>
      restoredMasterPublicKey(data.masterXPub, data.masterBlindingKey, data.restorerOpts, network),
  };
}

// MultisigAccount aims to handle cosigner
// use master extended public keys from cosigners and xpub derived from master private key (mnemonic)
export type MultisigAccount = Account<Multisig, MultisigWatchOnly>;
