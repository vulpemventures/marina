import * as ecc from 'tiny-secp256k1';
import type {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString} from 'ldk';
import {
  IdentityType,
 masterPubKeyRestorerFromEsplora } from 'ldk';
import { decrypt } from '../application/utils/crypto';
import {
  newMasterPublicKey,
  restoredMasterPublicKey,
  restoredMnemonic,
} from '../application/utils/restorer';
import type {
  CovenantDescriptors,
  CovenantIdentity} from './covenant-identity';
import {
  CovenantIdentityWatchOnly,
  covenantRestorerFromEsplora,
  restoredCovenantIdentity,
  restoredCovenantWatchOnlyIdentity,
} from './covenant-identity';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';

export const MainAccountID = 'mainAccount';
export type AccountID = string;

export enum AccountType {
  SingleSigAccount = 0,
  CovenantAccount = 1,
}

/**
 * Account domain represents the keys of the User
 *
 * - each Account is a derived of master private key (computed from mnemonic).
 * - an Account returns two types of identities: a WatchOnly identity and a signing Identity.
 *    the watch-only identity is used to update utxos and transactions state
 *    the signing identity is used to sign inputs. it needs the user's password to decrypt the mnemonic.
 */
export interface Account<
  SignID extends IdentityInterface = IdentityInterface,
  WatchID extends IdentityInterface = IdentityInterface
> {
  getAccountID(): AccountID;
  getSigningIdentity(password: string, network: NetworkString): Promise<SignID>;
  getWatchIdentity(network: NetworkString): Promise<WatchID>;
  getDeepRestorer(network: NetworkString): Restorer<EsploraRestorerOpts, WatchID>;
}

// AccountData is the base interface of all accounts data
// it is used to discriminate account by their type
export interface AccountData {
  type: AccountType;
  [key: string]: any;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey>;

export interface MnemonicAccountData extends AccountData {
  type: AccountType.SingleSigAccount;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

// Covenant account is decribed with
// - an eltr output descriptor template
// - a namespace (used to derive the mnemonic)
export type CovenantAccount = Account<CovenantIdentity, CovenantIdentityWatchOnly>;

export interface CovenantAccountData extends AccountData {
  type: AccountType.CovenantAccount;
  covenantDescriptors: CovenantDescriptors;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

// Factory for mainAccount
function createMainAccount(
  encryptedMnemonic: EncryptedMnemonic,
  data: MnemonicAccountData
): MnemonicAccount {
  return {
    getAccountID: () => MainAccountID,
    getSigningIdentity: (password: string, network: NetworkString) =>
      restoredMnemonic(decrypt(encryptedMnemonic, password), data.restorerOpts[network], network),
    getWatchIdentity: (network: NetworkString) =>
      restoredMasterPublicKey(
        data.masterXPub,
        data.masterBlindingKey,
        data.restorerOpts[network],
        network
      ),
    getDeepRestorer: (network: NetworkString) =>
      masterPubKeyRestorerFromEsplora(
        newMasterPublicKey(data.masterXPub, data.masterBlindingKey, network)
      ),
  };
}

// Factory for covenantAccount
function createCovenantAccount(
  encryptedMnemonic: EncryptedMnemonic,
  data: CovenantAccountData
): CovenantAccount {
  return {
    getAccountID: () => data.covenantDescriptors.namespace,
    getSigningIdentity: (password: string, network: NetworkString) =>
      restoredCovenantIdentity(
        data.covenantDescriptors,
        decrypt(encryptedMnemonic, password),
        network,
        data.restorerOpts[network]
      ),
    getWatchIdentity: (network: NetworkString) =>
      restoredCovenantWatchOnlyIdentity(
        data.covenantDescriptors,
        data.masterXPub,
        data.masterBlindingKey,
        network,
        data.restorerOpts[network]
      ),
    getDeepRestorer: (network: NetworkString) =>
      covenantRestorerFromEsplora(
        new CovenantIdentityWatchOnly({
          type: IdentityType.MasterPublicKey,
          chain: network,
          ecclib: ecc,
          opts: {
            ...data.covenantDescriptors,
            masterBlindingKey: data.masterBlindingKey,
            masterPublicKey: data.masterXPub,
          },
        })
      ),
  };
}

const factories = new Map<
  AccountType,
  (encryptedMnemonic: EncryptedMnemonic, data: any) => Account
>()
  .set(AccountType.SingleSigAccount, createMainAccount)
  .set(AccountType.CovenantAccount, createCovenantAccount);

export const createAccount = (encryptedMnemonic: EncryptedMnemonic, data: AccountData): Account => {
  const factory = factories.get(data.type);
  if (!factory) {
    throw new Error(`Unknown account type ${data.type}`);
  }
  return factory(encryptedMnemonic, data);
};

export const initialRestorerOpts: StateRestorerOpts = {
  lastUsedExternalIndex: -1,
  lastUsedInternalIndex: -1,
};
