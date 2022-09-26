import type {
  IdentityInterface,
  MasterPublicKey,
  Mnemonic,
  StateRestorerOpts,
  Restorer,
  NetworkString,
  ChainAPI,
} from 'ldk';
import { restorerFromState, toXpub } from 'ldk';
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
  newCustomScriptWatchOnlyIdentity,
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
  getNotRestoredWatchIdentity(network: NetworkString): WatchID;
  getInfo(): AccountInfoType;
}

// AccountData is the base interface of all accounts data
// it is used to discriminate account by their type
export interface AccountData {
  type: AccountType;
  masterXPub: MasterXPub;
  masterBlindingKey: MasterBlindingKey;
  [key: string]: any;
}

export interface ChainAPIRestorerOpts {
  api: ChainAPI;
  gapLimit: number;
}

// Main Account uses the default Mnemonic derivation path
// single-sig account used to send/receive regular assets
export type MnemonicAccount = Account<Mnemonic, MasterPublicKey> & {
  getDeepRestorer(network: NetworkString): Restorer<ChainAPIRestorerOpts, IdentityInterface>;
};

export interface MnemonicAccountData extends AccountData {
  type: AccountType.MainAccount;
  restorerOpts: Record<NetworkString, StateRestorerOpts>;
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
    getNotRestoredWatchIdentity: (network: NetworkString) =>
      newMasterPublicKey(data.masterXPub, data.masterBlindingKey, network),
    getDeepRestorer: (network: NetworkString) => {
      const pubkey = newMasterPublicKey(data.masterXPub, data.masterBlindingKey, network);
      return makeRestorerFromChainAPI<MasterPublicKey>(
        pubkey,
        (isChange, index) => pubkey.getAddress(isChange, index).address.confidentialAddress
      );
    },
    getInfo: () => ({
      accountID: MainAccountID, // main account ID is unique
      masterXPub: toXpub(data.masterXPub),
      isReady: true, // always true for main account
      descriptor: `elwpkh(${toXpub(data.masterXPub)})`,
      template: `elwpkh($${MainAccountID})`,
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
    getNotRestoredWatchIdentity: (network: NetworkString) =>
      newCustomScriptWatchOnlyIdentity(
        data.masterXPub,
        data.masterBlindingKey,
        data.contractTemplate,
        network
      ),
    getInfo: () => ({
      accountID: data.contractTemplate?.namespace ?? '',
      masterXPub: toXpub(data.masterXPub),
      isReady: data.contractTemplate?.template !== undefined,
      template: data.contractTemplate?.template,
      isSpendableByMarina: data.contractTemplate?.isSpendableByMarina,
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

function makeRestorerFromChainAPI<T extends IdentityInterface>(
  id: T,
  getAddress: (isChange: boolean, index: number) => string
): Restorer<{ api: ChainAPI; gapLimit: number }, IdentityInterface> {
  return async ({ gapLimit, api }) => {
    const restoreFunc = async function (
      getAddrFunc: (index: number) => Promise<string>
    ): Promise<number | undefined> {
      let counter = 0;
      let next = 0;
      let maxIndex: number | undefined = undefined;

      while (counter < gapLimit) {
        const cpyNext = next;
        // generate a set of addresses from next to (next + gapLimit - 1)
        const addrs = await Promise.all(
          Array.from(Array(gapLimit).keys())
            .map((i) => i + cpyNext)
            .map(getAddrFunc)
        );

        const hasBeenUsedArray = await api.addressesHasBeenUsed(addrs);

        let indexInArray = 0;
        for (const hasBeenUsed of hasBeenUsedArray) {
          if (hasBeenUsed) {
            maxIndex = indexInArray + next;
            counter = 0;
          } else {
            counter++;
            if (counter === gapLimit) return maxIndex; // duplicate the stop condition
          }
          indexInArray++;
        }

        next += gapLimit; // increase next
      }

      return maxIndex;
    };
    const restorerExternal = restoreFunc((index: number) => {
      return Promise.resolve(getAddress(false, index));
    });

    const restorerInternal = restoreFunc((index: number) => {
      return Promise.resolve(getAddress(true, index));
    });

    const [lastUsedExternalIndex, lastUsedInternalIndex] = await Promise.all([
      restorerExternal,
      restorerInternal,
    ]);

    return restorerFromState(id)({
      lastUsedExternalIndex,
      lastUsedInternalIndex,
    });
  };
}
