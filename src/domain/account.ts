import {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString,
  restorerFromState,
  IdentityType,
} from 'ldk';
import { masterPubKeyRestorerFromEsplora } from 'ldk';
import { decrypt } from '../application/utils/crypto';
import {
  newMasterPublicKey,
  restoredMasterPublicKey,
  restoredMnemonic,
} from '../application/utils/restorer';
import { CovenantDescriptors, CovenantIdentity, CovenantIdentityWatchOnly, covenantRestorerFromEsplora, restoredCovenantIdentity, restoredCovenantWatchOnlyIdentity } from './covenant-identity';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';

export const MainAccountID = 'mainAccount';
export type AccountID = string;

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

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey>;

export interface MnemonicAccountData {
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createMnemonicAccount(data: MnemonicAccountData): MnemonicAccount {
  return {
    getAccountID: () => MainAccountID,
    getSigningIdentity: (password: string, network: NetworkString) =>
      restoredMnemonic(
        decrypt(data.encryptedMnemonic, password),
        data.restorerOpts[network],
        network
      ),
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

// Covenant account
export type CovenantAccount = Account

export interface CovenantAccountData {
  covenantDescriptors: CovenantDescriptors;
  encryptedMnemonic: EncryptedMnemonic;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

export function createCovenantAccount(data: CovenantAccountData): CovenantAccount {
  return {
    getAccountID: () => data.covenantDescriptors.namespace,
    getSigningIdentity: (password: string, network: NetworkString) => restoredCovenantIdentity(
      data.covenantDescriptors,
      decrypt(data.encryptedMnemonic, password),
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
          opts: {
            ...data.covenantDescriptors,
            masterBlindingKey: data.masterBlindingKey,
            masterPublicKey: data.masterXPub,
          }
        }),
      )
  }
}

export const initialRestorerOpts: StateRestorerOpts = {
  lastUsedExternalIndex: -1,
  lastUsedInternalIndex: -1,
};
