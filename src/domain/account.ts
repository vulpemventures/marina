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
import { IdentityType, masterPubKeyRestorerFromEsplora } from 'ldk';
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
} from './customscript-identity';
import {
  CustomScriptIdentityWatchOnly,
  customScriptRestorerFromEsplora,
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
  getSigningIdentity(password: string, network: NetworkString): Promise<SignID>;
  getWatchIdentity(network: NetworkString): Promise<WatchID>;
  getDeepRestorer(network: NetworkString): Restorer<EsploraRestorerOpts, WatchID>;
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
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey>;

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
    getSigningIdentity: (password: string, network: NetworkString) =>
      restoredCustomScriptIdentity(
        data.covenantDescriptors,
        decrypt(encryptedMnemonic, password),
        network,
        data.restorerOpts[network]
      ),
    getWatchIdentity: (network: NetworkString) =>
      restoredCustomScriptWatchOnlyIdentity(
        data.covenantDescriptors,
        data.masterXPub,
        data.masterBlindingKey,
        network,
        data.restorerOpts[network]
      ),
    getDeepRestorer: (network: NetworkString) =>
      customScriptRestorerFromEsplora(
        new CustomScriptIdentityWatchOnly({
          type: IdentityType.MasterPublicKey,
          chain: network,
          ecclib: ecc,
          opts: {
            ...data.covenantDescriptors,
            masterBlindingKey: data.masterBlindingKey,
            masterPublicKey: data.masterXPub,
          },
        }),
        data.restorerOpts[network].customParamsByIndex,
        data.restorerOpts[network].customParamsByChangeIndex
      ),
    getInfo: () => ({
      accountID: data.covenantDescriptors.namespace,
      masterXPub: data.masterXPub,
      isReady: data.covenantDescriptors.template !== undefined,
      changeTemplate: data.covenantDescriptors.changeTemplate,
      template: data.covenantDescriptors.template,
      isSpendableByMarina: data.covenantDescriptors.isSpendableByMarina,
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
