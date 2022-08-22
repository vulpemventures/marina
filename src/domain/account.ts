import * as ecc from 'tiny-secp256k1';
import type {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  EsploraRestorerOpts,
  NetworkString,
} from 'ldk';
import ECPairFactory from 'ecpair';
import type { ECPairInterface } from 'ecpair';
import BIP32Factory from 'bip32';
import * as bip39 from 'bip39';
import { networks } from 'liquidjs-lib';
import { masterPubKeyRestorerFromEsplora } from 'ldk';
import { decrypt } from '../application/utils/crypto';
import {
  newMasterPublicKey,
  restoredMasterPublicKey,
  restoredMnemonic,
} from '../application/utils/restorer';
import type {
  ContractTemplate,
  CustomScriptIdentity,
  CustomRestorerOpts,
  CustomScriptIdentityWatchOnly,
} from './customscript-identity';
import {
  restoredCustomScriptIdentity,
  restoredCustomScriptWatchOnlyIdentity,
} from './customscript-identity';
import type { EncryptedMnemonic } from './encrypted-mnemonic';
import type { MasterBlindingKey } from './master-blinding-key';
import type { MasterXPub } from './master-extended-pub';
import type { AccountInfo } from 'marina-provider';

export const MainAccountID = 'mainAccount';
export type AccountID = string;

export enum AccountType {
  MainAccount = 0,
  CustomScriptAccount = 1,
}

/**
 * Account domain represents the keys of the User
 *
 * - each Account is derived from master private key (computed from mnemonic).
 * - an Account returns two types of identities: a WatchOnly identity and a signing Identity.
 *    the watch-only identity is used to update utxos and transactions state
 *    the signing identity is used to sign inputs. it needs the user's password to decrypt the mnemonic.
 */
export interface Account<
  SignID extends IdentityInterface = IdentityInterface,
  WatchID extends IdentityInterface = IdentityInterface,
  AccountInfoType extends AccountInfo = AccountInfo // can be overriden to add custom infos
> {
  type: AccountType;
  getAccountID(): AccountID;
  getSigningKeyUnsafe(
    password: string,
    derivationPath: string,
    network: NetworkString
  ): ECPairInterface;
  getSigningIdentity(password: string, network: NetworkString): Promise<SignID>;
  getWatchIdentity(network: NetworkString): Promise<WatchID>;
  getInfo(): AccountInfoType;
}

// AccountData is the base interface of all accounts data
// it is used to discriminate account by their type
export interface AccountData {
  type: AccountType;
  [key: string]: any;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey> & {
  getDeepRestorer(network: NetworkString): Restorer<EsploraRestorerOpts, MasterPublicKey>;
};

export interface MnemonicAccountData extends AccountData {
  type: AccountType.MainAccount;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

// custom script account is decribed with
// - an eltr output descriptor template
// - a namespace (used to derive the mnemonic)
export type CustomScriptAccount = Account<
  CustomScriptIdentity,
  CustomScriptIdentityWatchOnly,
  Pick<ContractTemplate, 'template' | 'isSpendableByMarina'> & AccountInfo
>;

export interface CustomScriptAccountData extends AccountData {
  type: AccountType.CustomScriptAccount;
  contractTemplate: ContractTemplate;
  restorerOpts: Record<NetworkString, CustomRestorerOpts>;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
}

// Factory for mainAccount
function createMainAccount(
  encryptedMnemonic: EncryptedMnemonic,
  data: MnemonicAccountData
): MnemonicAccount {
  return {
    type: AccountType.MainAccount,
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
    getInfo: () => ({
      accountID: MainAccountID, // main account is unique
      masterXPub: data.masterXPub,
      isReady: true, // always true for main account
    }),
  };
}

// Factory for customScriptAccount
function createCustomScriptAccount(
  encryptedMnemonic: EncryptedMnemonic,
  data: CustomScriptAccountData
): CustomScriptAccount {
  return {
    type: AccountType.CustomScriptAccount,
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
      restoredCustomScriptIdentity(
        data.contractTemplate,
        decrypt(encryptedMnemonic, password),
        network,
        data.restorerOpts[network]
      ),
    getWatchIdentity: (network: NetworkString) =>
      restoredCustomScriptWatchOnlyIdentity(
        data.contractTemplate,
        data.masterXPub,
        data.masterBlindingKey,
        network,
        data.restorerOpts[network]
      ),
    getInfo: () => ({
      accountID: data.contractTemplate.namespace,
      masterXPub: data.masterXPub,
      isReady: data.contractTemplate.template !== undefined,
      template: data.contractTemplate.template,
      isSpendableByMarina: data.contractTemplate.isSpendableByMarina,
    }),
  };
}

const factories = new Map<
  AccountType,
  (encryptedMnemonic: EncryptedMnemonic, data: any) => Account
>()
  .set(AccountType.MainAccount, createMainAccount)
  .set(AccountType.CustomScriptAccount, createCustomScriptAccount);

export const accountFromMnemonicAndData = (
  encryptedMnemonic: EncryptedMnemonic,
  data: AccountData
): Account => {
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

export const initialCustomRestorerOpts: CustomRestorerOpts = {
  lastUsedExternalIndex: -1,
  lastUsedInternalIndex: -1,
  customParamsByIndex: {},
  customParamsByChangeIndex: {},
};
