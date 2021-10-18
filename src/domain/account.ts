import { IdentityInterface, MasterPublicKey, Mnemonic, Multisig, MultisigWatchOnly, StateRestorerOpts } from 'ldk';
import { decrypt } from '../application/utils';
import { restoredMasterPublicKey, restoredMnemonic } from '../application/utils/restorer';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';
import { Network } from './network';

export type AccountID = string;
export const MainAccountID: AccountID = 'main';

/**
 * Account domain represents the keys of the User
 * 
 * - each Account is a derived of master private key (computed from mnemonic).
 * - an Account returns two types of identities: a WatchOnly identity and a signing Identity.
 *    the watch-only identity is used to update utxos and transactions state
 *    the signing identity is used to sign inputs. it needs the user's password to decrypt the mnemonic.
 */
export interface Account<SignID extends IdentityInterface = IdentityInterface, WatchID extends IdentityInterface = IdentityInterface> {
  accountID: AccountID;
  getSigningIdentity(password: string): Promise<SignID>;
  getWatchIdentity(): Promise<WatchID>;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MainAccount = Account<Mnemonic, MasterPublicKey>;

export interface MnemonicAccountData {
  accountID: AccountID;
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: StateRestorerOpts;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createMnemonicAccount(data: MnemonicAccountData, network: Network): MainAccount {
  return {
    accountID: data.accountID,
    getSigningIdentity: (password: string) =>
      restoredMnemonic(decrypt(data.encryptedMnemonic, password), data.restorerOpts, network),
    getWatchIdentity: () =>
      restoredMasterPublicKey(data.masterXPub, data.masterBlindingKey, data.restorerOpts, network),
  };
}

// MultisigAccount aims to handle account with cosigner(s)
// use master extended public keys from cosigners and xpub derived from master private key (mnemonic)
export type MultisigAccount = Account<Multisig, MultisigWatchOnly>;
