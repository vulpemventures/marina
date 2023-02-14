import * as ecc from 'tiny-secp256k1';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { address, networks, payments } from 'liquidjs-lib';
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
import type { ChainSource } from '../domain/chainsource';
import type { AccountDetails, AppRepository, WalletRepository } from '../infrastructure/repository';
import type { Argument } from '@ionio-lang/ionio';
import { Contract } from '@ionio-lang/ionio';
import { h2b } from '../utils';
import type { ZKPInterface } from 'liquidjs-lib/src/confidential';

export const MainAccountLegacy = 'mainAccountLegacy';
export const MainAccount = 'mainAccount';
export const MainAccountTest = 'mainAccountTest';

const bip32 = BIP32Factory(ecc);
const slip77 = SLIP77Factory(ecc);

const GAP_LIMIT = 20;

type PubKeyWithRelativeDerivationPath = {
  publicKey: Buffer;
  derivationPath: string;
};

type AccountOpts = {
  masterPublicKey: string;
  masterBlindingKey: string;
  chainSource: ChainSource;
  walletRepository: WalletRepository;
  network: NetworkString;
  name: string;
};

export class AccountFactory {
  chainSources = new Map<NetworkString, ChainSource>();
  masterBlindingKey: string | undefined;

  private constructor(private walletRepository: WalletRepository) {}

  static async create(
    walletRepository: WalletRepository,
    appRepository: AppRepository,
    networks?: NetworkString[]
  ): Promise<AccountFactory> {
    const factory = new AccountFactory(walletRepository);
    for (const net of networks || (['liquid', 'testnet', 'regtest'] as NetworkString[])) {
      const chainSource = await appRepository.getChainSource(net);
      if (!chainSource) {
        console.error('Chain source not found', net);
        continue;
      }
      factory.chainSources.set(net, chainSource);
    }

    const masterBlindingKey = await walletRepository.getMasterBlindingKey();
    if (!masterBlindingKey) throw new Error('Master blinding key not found');
    factory.masterBlindingKey = masterBlindingKey;
    return factory;
  }

  async make(network: NetworkString, accountName: string): Promise<Account> {
    const { [accountName]: details } = await this.walletRepository.getAccountDetails(accountName);
    if (!details) throw new Error('Account not found');
    if (details.accountNetworks.indexOf(network) === -1)
      throw new Error(`Account ${accountName} does not support network: ${network}`);
    const chainSource = this.chainSources.get(network);
    if (!chainSource) throw new Error('Chain source not found');
    return new Account({
      name: accountName,
      chainSource,
      masterPublicKey: details.masterXPub,
      masterBlindingKey: this.masterBlindingKey!,
      walletRepository: this.walletRepository,
      network,
    });
  }
}

// Account is a readonly way to interact with the account data (transactions, utxos, scripts, etc.)
export class Account {
  private chainSource: ChainSource;
  private network: networks.Network;
  private node: BIP32Interface;
  private blindingKeyNode: Slip77Interface;
  private walletRepository: WalletRepository;
  private _cacheAccountType: AccountType | undefined;
  readonly name: string;

  static BASE_DERIVATION_PATH = "m/84'/1776'/0'";
  static BASE_DERIVATION_PATH_LEGACY = "m/84'/0'/0'";
  static BASE_DERIVATION_PATH_TESTNET = "m/84'/1'/0'";

  constructor({
    chainSource,
    masterBlindingKey,
    masterPublicKey,
    network,
    walletRepository,
    name,
  }: AccountOpts) {
    this.name = name;
    this.chainSource = chainSource;
    this.network = networks[network];
    this.node = bip32.fromBase58(masterPublicKey);
    this.blindingKeyNode = slip77.fromMasterBlindingKey(masterBlindingKey);
    this.walletRepository = walletRepository;
  }

  async subscribeAllScripts(): Promise<void> {
    const scripts = Object.keys(
      await this.walletRepository.getAccountScripts(this.network.name as NetworkString, this.name)
    ).map((b) => Buffer.from(b, 'hex'));

    for (const script of scripts) {
      await this.chainSource.subscribeScriptStatus(script, async (_: string, __: string | null) => {
        const history = await this.chainSource.fetchHistories([script]);
        const historyTxId = history[0].map(({ tx_hash }) => tx_hash);
        await Promise.all([
          this.walletRepository.addTransactions(this.network.name as NetworkString, ...historyTxId),
          this.walletRepository.updateTxDetails(
            Object.fromEntries(history[0].map(({ tx_hash, height }) => [tx_hash, { height }]))
          ),
        ]);
      });
    }
  }

  async unsubscribeAllScripts(): Promise<void> {
    const scripts = Object.keys(
      await this.walletRepository.getAccountScripts(this.network.name as NetworkString, this.name)
    ).map((b) => Buffer.from(b, 'hex'));

    for (const script of scripts) {
      await this.chainSource.unsubscribeScriptStatus(script);
    }
  }

  async getAllAddresses(): Promise<Address[]> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get all addresses');
    if (!this.name) throw new Error('No name, cannot get all addresses');
    const type = await this.getAccountType();
    const scripts = await this.walletRepository.getAccountScripts(
      this.network.name as NetworkString,
      this.name
    );

    switch (type) {
      case AccountType.P2WPKH: {
        return Object.entries(scripts).map(([script, details]) => ({
          confidentialAddress: this.createP2WPKHAddress(Buffer.from(script, 'hex')),
          ...details,
        }));
      }
      case AccountType.Ionio: {
        const zkp = await ZKPLib();
        return Object.entries(scripts).map(([script, details]) => ({
          confidentialAddress: this.createTaprootAddress(Buffer.from(script, 'hex')),
          ...details,
          contract: isIonioScriptDetails(details)
            ? new Contract(details.artifact, details.params, this.network, {
                ecc,
                zkp,
              })
            : undefined,
        }));
      }
      default:
        throw new Error('Account type not supported');
    }
  }

  // get next address generate a new script and persist its details in cache
  // it also increments the account last used index depending on isInternal
  async getNextAddress(
    isInternal: boolean,
    artifactWithArgs?: ArtifactWithConstructorArgs
  ): Promise<Address> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get next address');
    if (!this.name) throw new Error('No name, cannot get next address');

    const nextIndexes = await this.getNextIndexes();
    const next = isInternal ? nextIndexes.internal : nextIndexes.external;
    const publicKeys = this.deriveBatchPublicKeys(next, next + 1, isInternal);
    const type = await this.getAccountType();

    let confidentialAddress = undefined;
    let script: string | undefined = undefined;
    let scriptDetails: ScriptDetails | undefined = undefined;

    switch (type) {
      case AccountType.P2WPKH:
        [script, scriptDetails] = this.createP2PWKHScript(publicKeys[0]);
        confidentialAddress = this.createP2WPKHAddress(Buffer.from(script, 'hex'));
        break;
      case AccountType.Ionio:
        if (!artifactWithArgs)
          throw new Error('Artifact with args is required for Ionio account type');
        [script, scriptDetails] = this.createTaprootScript(
          publicKeys[0],
          artifactWithArgs,
          await ZKPLib()
        );
        confidentialAddress = this.createTaprootAddress(Buffer.from(script, 'hex'));
        break;
      default:
        throw new Error('Unsupported account type');
    }

    if (!script || !scriptDetails) throw new Error('unable to derive new script');
    if (!confidentialAddress) throw new Error('unable to create address from script:' + script);

    // increment the account details last used index & persist the new script details
    await Promise.allSettled([
      this.walletRepository.updateAccountKeyIndex(this.name, this.network.name as NetworkString, {
        [isInternal ? 'internal' : 'external']: next + 1,
      }),
      this.walletRepository.updateScriptDetails({
        [script]: scriptDetails,
      }),
    ]);

    return {
      confidentialAddress,
      ...scriptDetails,
      contract: isIonioScriptDetails(scriptDetails)
        ? new Contract(scriptDetails.artifact, scriptDetails.params, this.network, {
            ecc,
            zkp: await ZKPLib(),
          })
        : undefined,
    };
  }

  async sync(
    gapLimit = GAP_LIMIT,
    start?: { internal: number; external: number }
  ): Promise<{
    next: { internal: number; external: number };
  }> {
    if (!this.chainSource) throw new Error('No chain source, cannot sync');
    if (!this.walletRepository) throw new Error('No wallet repository, cannot sync');
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
        const histories = await this.chainSource.fetchHistories(scripts);

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
      next: {
        internal: indexes.internal,
        external: indexes.external,
      },
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

  private async getNextIndexes(): Promise<{ internal: number; external: number }> {
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
    this._cacheAccountType = accountDetails.type;
    if (!accountDetails) throw new Error('Account details not found');
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

  // segwit v0 confidential address
  private createP2WPKHAddress(script: Buffer): string {
    const { publicKey: blindkey } = this.deriveBlindingKey(script);
    const address = payments.p2wpkh({
      output: script,
      network: this.network,
      blindkey,
    }).confidentialAddress;
    if (!address) throw new Error('Could not derive address');
    return address;
  }

  private createTaprootScript(
    { publicKey, derivationPath }: PubKeyWithRelativeDerivationPath,
    { artifact, args }: ArtifactWithConstructorArgs,
    zkp: ZKPInterface
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
      return param;
    });
    const contract = new Contract(artifact, constructorArgs, this.network, { ecc, zkp });
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

  // segwit v1 confidential address
  private createTaprootAddress(script: Buffer): string {
    const { publicKey: blindkey } = this.deriveBlindingKey(script);
    return address.toConfidential(address.fromOutputScript(script, this.network), blindkey);
  }
}
