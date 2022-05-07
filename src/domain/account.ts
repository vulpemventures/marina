import {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  EsploraRestorerOpts,
  masterPubKeyRestorerFromEsplora,
  NetworkString,
} from 'ldk';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import { networks } from 'liquidjs-lib';
import { decrypt } from '../application/utils/crypto';
import {
  newMasterPublicKey,
  restoredMasterPublicKey,
  restoredMnemonic,
} from '../application/utils/restorer';
import { EncryptedMnemonic } from './encrypted-mnemonic';
import { MasterBlindingKey } from './master-blinding-key';
import { MasterXPub } from './master-extended-pub';

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
  getSigningKeyUnsafe(
    password: string,
    derivationPath: string,
    network: NetworkString
  ): ECPairInterface;
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
    getSigningKeyUnsafe: (password: string, derivationPath: string, network: NetworkString) => {
      const mnemonic = decrypt(data.encryptedMnemonic, password);
      // retreive the wallet's seed from mnemonic
      const walletSeed = bip39.mnemonicToSeedSync(mnemonic);
      // generate the master private key from the wallet seed
      const networkObj = (networks as Record<string, any>)[network];
      const bip32 = BIP32Factory(ecc);
      const masterPrivateKeyNode = bip32.fromSeed(walletSeed, networkObj);

      const { privateKey } = masterPrivateKeyNode.derivePath(derivationPath);
      return ECPairFactory(ecc).fromPrivateKey(privateKey!, { network: networkObj });
    },
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
