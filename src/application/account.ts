import * as ecc from 'tiny-secp256k1';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { ECPairFactory } from 'ecpair';
import type { Secp256k1Interface } from 'liquidjs-lib';
import { address, crypto, networks, payments } from 'liquidjs-lib';
import type {
  Address,
  ArtifactWithConstructorArgs,
  IonioScriptDetails,
  NetworkString,
  ScriptDetails,
} from 'marina-provider';
import { AccountType, isIonioScriptDetails } from 'marina-provider';
import type { Slip77Interface } from 'slip77';
import { SLIP77Factory } from 'slip77';
import type { AccountDetails, WalletRepository } from '../domain/repository';
import type { Argument, Artifact } from '@ionio-lang/ionio';
import { Contract } from '@ionio-lang/ionio';
import { h2b } from './utils';
import type { ChainSource } from '../domain/chainsource';
import type { RestorationJSON, RestorationJSONDictionary } from '../domain/backup';

export const MainAccountLegacy = 'mainAccountLegacy';
export const MainAccount = 'mainAccount';
export const MainAccountTest = 'mainAccountTest';

const bip32 = BIP32Factory(ecc);
const slip77 = SLIP77Factory(ecc);
const ecpair = ECPairFactory(ecc);

const GAP_LIMIT = 20;

type PubKeyWithRelativeDerivationPath = {
  publicKey: Buffer;
  derivationPath: string;
};

type AccountOpts = {
  masterPublicKey: string;
  masterBlindingKey: string;
  walletRepository: WalletRepository;
  network: NetworkString;
  name: string;
};

type contractName = string;

export function makeAccountXPub(seed: Buffer, basePath: string) {
  return bip32.fromSeed(seed).derivePath(basePath).neutered().toBase58();
}

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
export function SLIP13(namespace: string): string {
  const hash = crypto.sha256(Buffer.from(namespace));
  const hash128 = hash.subarray(0, 16);
  const A = hash128.readUInt32LE(0) || 0x80000000;
  const B = hash128.readUint32LE(4) || 0x80000000;
  const C = hash128.readUint32LE(8) || 0x80000000;
  const D = hash128.readUint32LE(12) || 0x80000000;
  return `m/${A}/${B}/${C}/${D}`;
}

// AccountFactory loads the master blinding key and creates account instance from repository data.
export class AccountFactory {
  private constructor(
    private walletRepository: WalletRepository,
    private masterBlindingKey: string
  ) {}

  static async create(walletRepository: WalletRepository): Promise<AccountFactory> {
    const masterBlindingKey = await walletRepository.getMasterBlindingKey();
    if (!masterBlindingKey) throw new Error('Master blinding key not found');
    return new AccountFactory(walletRepository, masterBlindingKey);
  }

  async make(network: NetworkString, accountName: string): Promise<Account> {
    const { [accountName]: details } = await this.walletRepository.getAccountDetails(accountName);
    if (!details) throw new Error('Account not found');
    if (details.accountNetworks.indexOf(network) === -1)
      throw new Error(`Account ${accountName} does not support network: ${network}`);
    return new Account({
      name: accountName,
      masterPublicKey: details.masterXPub,
      masterBlindingKey: this.masterBlindingKey,
      walletRepository: this.walletRepository,
      network,
    });
  }

  async makeAll(network: NetworkString): Promise<Account[]> {
    const accounts = await this.walletRepository.getAccountDetails();
    return Object.entries(accounts)
      .filter(([_, details]) => details.accountNetworks.indexOf(network) !== -1)
      .map(
        ([name, details]) =>
          new Account({
            name,
            masterPublicKey: details.masterXPub,
            masterBlindingKey: this.masterBlindingKey,
            walletRepository: this.walletRepository,
            network,
          })
      );
  }
}

// Account is a readonly way to interact with the account data (transactions, utxos, scripts, etc.)
export class Account {
  private node: BIP32Interface;
  private blindingKeyNode: Slip77Interface;
  private walletRepository: WalletRepository;
  private _cacheAccountType: AccountType | undefined;
  readonly network: networks.Network;
  readonly name: string;

  static BASE_DERIVATION_PATH = "m/84'/1776'/0'";
  static BASE_DERIVATION_PATH_LEGACY = "m/84'/0'/0'";
  static BASE_DERIVATION_PATH_TESTNET = "m/84'/1'/0'";

  constructor({
    masterBlindingKey,
    masterPublicKey,
    network,
    walletRepository,
    name,
  }: AccountOpts) {
    this.name = name;
    this.network = networks[network];
    this.node = bip32.fromBase58(masterPublicKey);
    this.blindingKeyNode = slip77.fromMasterBlindingKey(masterBlindingKey);
    this.walletRepository = walletRepository;
  }

  async getAllAddresses(): Promise<Address[]> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get all addresses');
    if (!this.name) throw new Error('No name, cannot get all addresses');
    const type = await this.getAccountType();
    const scripts = await this.walletRepository.getAccountScripts(
      this.network.name as NetworkString,
      this.name
    );

    const zkpLib = await ZKPLib();

    return Object.entries(scripts).map(([script, details]) =>
      scriptDetailsWithKeyToAddress(this.network, type, zkpLib)(
        script,
        details,
        details.derivationPath
          ? this.node.derivePath(details.derivationPath.replace('m/', '')).publicKey.toString('hex')
          : ''
      )
    );
  }

  // get next address generate a new script and persist its details in cache
  // it also increments the account last used index depending on isInternal
  async getNextAddress(
    isInternal: boolean,
    artifactWithArgs?: ArtifactWithConstructorArgs
  ): Promise<Address & { confidentialAddress: string }> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get next address');
    if (!this.name) throw new Error('No name, cannot get next address');

    const nextIndexes = await this.getNextIndexes();
    const next = isInternal ? nextIndexes.internal : nextIndexes.external;
    const keyPair = this.deriveBatchPublicKeys(next, next + 1, isInternal)[0];
    const type = await this.getAccountType();

    let script: string | undefined = undefined;
    let scriptDetails: ScriptDetails | undefined = undefined;

    switch (type) {
      case AccountType.P2WPKH:
        [script, scriptDetails] = this.createP2PWKHScript(keyPair);
        break;
      case AccountType.Ionio:
        if (!artifactWithArgs)
          throw new Error('Artifact with args is required for Ionio account type');
        [script, scriptDetails] = this.createTaprootScript(
          keyPair,
          artifactWithArgs,
          await ZKPLib()
        );
        break;
      default:
        throw new Error('Unsupported account type');
    }

    if (!script || !scriptDetails) throw new Error('unable to derive new script');

    // increment the account details last used index & persist the new script details
    await Promise.all([
      this.walletRepository.updateAccountKeyIndex(this.name, this.network.name as NetworkString, {
        [isInternal ? 'internal' : 'external']: next + 1,
      }),
      this.walletRepository.updateScriptDetails({
        [script]: scriptDetails,
      }),
    ]);

    const zkpLib = await ZKPLib();
    const addr = scriptDetailsWithKeyToAddress(this.network, type, zkpLib)(
      script,
      scriptDetails,
      keyPair.publicKey.toString('hex')
    );
    if (!addr.confidentialAddress)
      throw new Error('unable to derive confidential address from script');
    return addr as Address & { confidentialAddress: string };
  }

  async sync(
    chainSource: ChainSource,
    gapLimit = GAP_LIMIT,
    start?: { internal: number; external: number }
  ): Promise<{
    txIDsFromChain: string[];
    next: { internal: number; external: number };
  }> {
    const type = await this.getAccountType();
    if (type !== AccountType.P2WPKH)
      throw new Error('Unsupported sync function for account type: ' + type);

    const historyTxsId: Set<string> = new Set();
    const txidHeight: Map<string, number | undefined> = new Map();
    let restoredScripts: Record<string, ScriptDetails> = {};
    let tempRestoredScripts: Record<string, ScriptDetails> = {};

    const indexes = start ?? (await this.getNextIndexes());
    const walletChains = [0, 1];
    for (const i of walletChains) {
      tempRestoredScripts = {};
      const isInternal = i === 1;
      let batchCount = isInternal ? indexes.internal : indexes.external;
      let unusedScriptCounter = 0;

      while (unusedScriptCounter <= gapLimit) {
        const publicKeys = this.deriveBatchPublicKeys(
          batchCount,
          batchCount + gapLimit,
          isInternal
        );
        const scriptsWithDetails = publicKeys.map((publicKey) =>
          this.createP2PWKHScript(publicKey)
        );

        const scripts = scriptsWithDetails.map(([script]) => h2b(script));
        const histories = await chainSource.fetchHistories(scripts);
        for (const [index, history] of histories.entries()) {
          tempRestoredScripts[scriptsWithDetails[index][0]] = scriptsWithDetails[index][1];
          if (history.length > 0) {
            unusedScriptCounter = 0; // reset counter
            // update the restored scripts with all the script details until now
            restoredScripts = { ...restoredScripts, ...tempRestoredScripts };
            tempRestoredScripts = {};
            const newMaxIndex = index + batchCount + 1;
            if (isInternal) indexes.internal = newMaxIndex;
            else indexes.external = newMaxIndex;

            // update the history set
            for (const { tx_hash, height } of history) {
              historyTxsId.add(tx_hash);
              txidHeight.set(tx_hash, height);
            }
          } else {
            unusedScriptCounter += 1;
          }
        }
        batchCount += gapLimit;
      }
    }

    await Promise.allSettled([
      this.walletRepository.addTransactions(this.network.name as NetworkString, ...historyTxsId),
      this.walletRepository.updateAccountKeyIndex(
        this.name,
        this.network.name as NetworkString,
        indexes
      ),
      this.walletRepository.updateTxDetails(
        Object.fromEntries(
          Array.from(historyTxsId).map((txid) => [txid, { height: txidHeight.get(txid) }])
        )
      ),
      this.walletRepository.updateScriptDetails(restoredScripts),
    ]);

    return {
      txIDsFromChain: Array.from(historyTxsId),
      next: {
        internal: indexes.internal,
        external: indexes.external,
      },
    };
  }

  async restoreFromJSON(chainSource: ChainSource, json: RestorationJSON): Promise<void> {
    const restoredScripts: Record<string, ScriptDetails> = {};
    const indexes = { internal: 0, external: 0 };

    const zkp = await ZKPLib();
    for (const [scriptRelativePath, [contractName, args]] of Object.entries(json.pathToArguments)) {
      const splittedPath = scriptRelativePath.split('/');
      const index = parseInt(splittedPath[splittedPath.length - 1]);
      const isInternal = splittedPath[splittedPath.length - 2] === '1';
      const pubKeyWithPath = this.deriveBatchPublicKeys(index, index + 1, isInternal)[0];
      const artifact = json.artifacts[contractName];
      const argsByName = artifact.constructorInputs.reduce((acc, input, index) => {
        if (input.name === this.name) return acc;
        acc[input.name] = args[index];
        return acc;
      }, {} as Record<string, Argument>);
      const [script, scriptDetails] = this.createTaprootScript(
        pubKeyWithPath,
        { artifact: json.artifacts[contractName], args: argsByName },
        zkp
      );
      restoredScripts[script] = scriptDetails;
      if (isInternal) indexes.internal = Math.max(indexes.internal, index + 1);
      else indexes.external = Math.max(indexes.external, index + 1);
    }

    const historyTxsId: Set<string> = new Set();
    const txidHeight: Map<string, number | undefined> = new Map();
    const histories = await chainSource.fetchHistories(Object.keys(restoredScripts).map(h2b));

    for (const history of histories.values()) {
      if (history.length > 0) {
        // update the history set
        for (const { tx_hash, height } of history) {
          historyTxsId.add(tx_hash);
          txidHeight.set(tx_hash, height);
        }
      }
    }

    await Promise.allSettled([
      this.walletRepository.addTransactions(this.network.name as NetworkString, ...historyTxsId),
      this.walletRepository.updateAccountKeyIndex(
        this.name,
        this.network.name as NetworkString,
        indexes
      ),
      this.walletRepository.updateTxDetails(
        Object.fromEntries(
          Array.from(historyTxsId).map((txid) => [txid, { height: txidHeight.get(txid) }])
        )
      ),
      this.walletRepository.updateScriptDetails(restoredScripts),
    ]);
  }

  async restorationJSON(): Promise<RestorationJSON> {
    if ((await this.getAccountType()) !== AccountType.Ionio)
      throw new Error('Account is not Ionio type, cannot export restoration JSON');
    const addresses = await this.getAllAddresses();
    const artifactByName: Record<contractName, Artifact> = {};
    const derivationPathToArgs: Record<string, [contractName, Argument[]]> = {};
    for (const address of addresses) {
      if (address.contract) {
        if (isIonioScriptDetails(address) && address.derivationPath) {
          if (!artifactByName[address.artifact.contractName]) {
            artifactByName[address.artifact.contractName] = address.artifact;
          }
          derivationPathToArgs[address.derivationPath] = [
            address.artifact.contractName,
            address.params,
          ];
        }
      }
    }
    return {
      accountName: this.name,
      artifacts: artifactByName,
      pathToArguments: derivationPathToArgs,
    };
  }

  private deriveBlindingKey(script: Buffer): { publicKey: Buffer; privateKey: Buffer } {
    if (!this.blindingKeyNode)
      throw new Error('No blinding key node, Account cannot derive blinding key');
    const derived = this.blindingKeyNode.derive(script);
    if (!derived.publicKey || !derived.privateKey) throw new Error('Could not derive blinding key');
    return { publicKey: derived.publicKey, privateKey: derived.privateKey };
  }

  // Derive a range from start to end index of public keys applying the base derivation path
  private deriveBatchPublicKeys(
    start: number,
    end: number,
    isInternal: boolean
  ): PubKeyWithRelativeDerivationPath[] {
    if (!this.node) throw new Error('No node, Account cannot derive scripts');
    const chain = isInternal ? 1 : 0;
    const results: PubKeyWithRelativeDerivationPath[] = [];
    for (let i = start; i < end; i++) {
      const child = this.node.derive(chain).derive(i);
      if (!child.publicKey) throw new Error('Could not derive public key');
      results.push({ publicKey: child.publicKey, derivationPath: `m/${chain}/${i}` });
    }

    return results;
  }

  async getNextIndexes(): Promise<{ internal: number; external: number }> {
    if (!this.walletRepository || !this.name) return { internal: 0, external: 0 };
    const { [this.name]: accountDetails } = await this.walletRepository.getAccountDetails(
      this.name
    );
    if (!accountDetails) return { internal: 0, external: 0 };
    const { nextKeyIndexes } = accountDetails;
    const net = this.network.name as NetworkString;
    if (!nextKeyIndexes || !nextKeyIndexes[net]) return { internal: 0, external: 0 };

    return {
      internal: nextKeyIndexes[net].internal || 0,
      external: nextKeyIndexes[net].external || 0,
    };
  }

  private async getAccountDetails(): Promise<AccountDetails> {
    const { [this.name]: accountDetails } = await this.walletRepository.getAccountDetails(
      this.name
    );
    if (!accountDetails) throw new Error('Account details not found');
    this._cacheAccountType = accountDetails.type;
    return accountDetails;
  }

  async getAccountType(): Promise<AccountType> {
    if (!this._cacheAccountType) {
      const details = await this.getAccountDetails();
      return details.type;
    }
    return this._cacheAccountType;
  }

  private createP2PWKHScript({
    publicKey,
    derivationPath,
  }: PubKeyWithRelativeDerivationPath): [string, ScriptDetails] {
    const script = payments.p2wpkh({ pubkey: publicKey, network: this.network }).output;
    if (!script) throw new Error('Could not derive script');
    return [
      script.toString('hex'),
      {
        derivationPath,
        accountName: this.name,
        networks: [this.network.name as NetworkString],
        blindingPrivateKey: this.deriveBlindingKey(script).privateKey.toString('hex'),
      },
    ];
  }

  // segwit v1 confidential address based on Ionio artifact
  private createTaprootScript(
    { publicKey, derivationPath }: PubKeyWithRelativeDerivationPath,
    { artifact, args }: ArtifactWithConstructorArgs,
    zkp: Contract['secp256k1ZKP']
  ): [string, ScriptDetails] {
    const constructorArgs: Argument[] = (artifact.constructorInputs || []).map(({ name }) => {
      // inject xOnlyPublicKey argument if one of the contructor args is named like the account name
      if (name === this.name) {
        return '0x'.concat(publicKey.subarray(1).toString('hex'));
      }
      const param = args[name];
      if (!param) {
        throw new Error(`missing contructor arg ${name}`);
      }
      if (param instanceof Uint8Array) {
        return Buffer.from(param);
      }
      return param;
    });
    const contract = new Contract(artifact, constructorArgs, this.network, zkp);
    const scriptDetails: IonioScriptDetails = {
      accountName: this.name,
      networks: [this.network.name as NetworkString],
      blindingPrivateKey: this.deriveBlindingKey(contract.scriptPubKey).privateKey.toString('hex'),
      derivationPath,
      artifact,
      params: constructorArgs,
    };
    return [contract.scriptPubKey.toString('hex'), scriptDetails];
  }
}

export function checkRestorationDictionary(
  dictionary: any
): dictionary is RestorationJSONDictionary {
  try {
    const possibleFields = ['liquid', 'testnet', 'regtest'];
    for (const field of possibleFields) {
      if (field in dictionary) {
        if (!Array.isArray(dictionary[field])) return false;
        for (const obj of dictionary[field]) {
          if (!isRestoration(obj)) return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

function isRestoration(obj: Record<string, unknown>): obj is RestorationJSON {
  return 'accountName' in obj && 'artifacts' in obj && 'pathToArguments' in obj;
}

function scriptDetailsWithKeyToAddress(
  network: networks.Network,
  type: AccountType,
  zkpLib: Secp256k1Interface
) {
  return function (script: string, details: ScriptDetails, publicKey: string): Address {
    const addr: Address = {
      ...details,
      script,
      publicKey,
    };

    try {
      const unconfidentialAddress = address.fromOutputScript(Buffer.from(script, 'hex'), network);
      addr.unconfidentialAddress = unconfidentialAddress;
      if (details.blindingPrivateKey) {
        const blindingPublicKey = ecpair.fromPrivateKey(
          Buffer.from(details.blindingPrivateKey, 'hex')
        ).publicKey;
        addr.confidentialAddress = address.toConfidential(unconfidentialAddress, blindingPublicKey);
      }
      if (type === AccountType.Ionio && isIonioScriptDetails(details)) {
        addr.contract = new Contract(details.artifact, details.params, network, zkpLib);
      }
      return addr;
    } catch (e) {
      return addr;
    }
  };
}
