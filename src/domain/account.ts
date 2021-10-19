import { DEFAULT_BASE_DERIVATION_PATH, HDSignerMultisig, IdentityInterface, IdentityType, MasterPublicKey, Mnemonic, Multisig, MultisigWatchOnly, StateRestorerOpts, XPub } from 'ldk';
import { decrypt } from '../application/utils';
import { restoredMasterPublicKey, restoredMnemonic, restoredMultisig, restoredWatchOnlyMultisig } from '../application/utils/restorer';
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

export interface MultisigAccountData<ExtraDataT = undefined> {
  baseDerivationPath: string; // we'll use the MainAccount in order to generate 
  signerXPub: XPub;
  cosignerXPubs: XPub[];
  requiredSignature: number;
  extraData: ExtraDataT;
}

export function create2of2MultisigAccountData<T>(signer: HDSignerMultisig, cosignerXPub: XPub, network: Network, extraData: T): MultisigAccountData<T> {
  const multisigID = new Multisig({
    chain: network,
    type: IdentityType.Multisig,
    opts: {
      requiredSignatures: 2,
      signer,
      cosigners: [cosignerXPub]
    }
  })
  
  return {
    baseDerivationPath: signer.baseDerivationPath || DEFAULT_BASE_DERIVATION_PATH,
    signerXPub: multisigID.getXPub(),
    cosignerXPubs: [cosignerXPub],
    requiredSignature: 2,
    extraData
  }
}

export function createMultisigAccount(encryptedMnemonic: EncryptedMnemonic, data: MultisigAccountData<any>, network: Network): MultisigAccount {
  return {
    accountID: data.signerXPub,
    getSigningIdentity: (password: string) => restoredMultisig({ mnemonic: decrypt(encryptedMnemonic, password), baseDerivationPath: data.baseDerivationPath }, data.cosignerXPubs, data.requiredSignature, network),
    getWatchIdentity: () => restoredWatchOnlyMultisig(data.signerXPub, data.cosignerXPubs, data.requiredSignature, network)
  }
}