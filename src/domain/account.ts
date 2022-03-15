import type {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString} from 'ldk';
import {
  masterPubKeyRestorerFromEsplora
} from 'ldk';
import { decrypt } from '../application/utils/crypto';
import {
  newMasterPublicKey,
  restoredMasterPublicKey,
  restoredMnemonic,
} from '../application/utils/restorer';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';

export const MainAccountID = 'mainAccount';
export const RestrictedAssetAccountID = 'restrictedAssetAccount';

export type AccountID = typeof MainAccountID;

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

export const initialRestorerOpts: StateRestorerOpts = {
  lastUsedExternalIndex: -1,
  lastUsedInternalIndex: -1,
};
