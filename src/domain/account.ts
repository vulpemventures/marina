import * as ecc from 'tiny-secp256k1';
import ZKPlib from '@vulpemventures/secp256k1-zkp';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { networks, payments } from 'liquidjs-lib';
import type { NetworkString } from 'marina-provider';
import type { Slip77Interface } from 'slip77';
import { SLIP77Factory } from 'slip77';
import type { ChainSource } from '../domain/chainsource';
import type { AppRepository, WalletRepository } from '../infrastructure/repository';
import { AccountDetails, AccountType, ScriptDetails } from './account-type';
import { Argument, Artifact, Contract } from '@ionio-lang/ionio';

const zkp = await ZKPlib();
const bip32 = BIP32Factory(ecc);
const slip77 = SLIP77Factory(ecc);

const GAP_LIMIT = 20;

const IONIO_NOT_SUPPORTED = new Error('Ionio account not supported');

type PubKeyWithRelativeDerivationPath = {
  publicKey: Buffer;
  derivationPath: string;
}

type AccountOpts = {
  masterPublicKey: string;
  masterBlindingKey: string;
  chainSource: ChainSource;
  walletRepository: WalletRepository;
  network: NetworkString;
  name: string;
};

export class AccountFactory {
  private chainSources = new Map<NetworkString, ChainSource>();
  masterBlindingKey: string | undefined;

  private constructor(private walletRepository: WalletRepository) { }

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
      masterPublicKey: details.masterPublicKey,
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
    const scripts = Object.keys(await this.walletRepository.getAccountScripts(
      this.network.name as NetworkString,
      this.name
    )).map(b => Buffer.from(b, 'hex'));

    console.log(`Subscribing to ${scripts.length} scripts for account ${this.name}`)
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
      })
    }
  }

  async unsubscribeAllScripts(): Promise<void> {
    const scripts = Object.keys(await this.walletRepository.getAccountScripts(
      this.network.name as NetworkString,
      this.name
    )).map(b => Buffer.from(b, 'hex'));

    for (const script of scripts) {
      await this.chainSource.unsubscribeScriptStatus(script);
    }
  }

  async getAllAddresses(): Promise<string[]> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get all addresses');
    if (!this.name) throw new Error('No name, cannot get all addresses');
    const type = await this.getAccountType();
    const scripts = await this.walletRepository.getAccountScripts(this.network.name as NetworkString, this.name);

    if (type === AccountType.P2WPH) {
      return Object.keys(scripts)
        .map((script: string) => this.createP2WKHAddress(Buffer.from(script, 'hex')));
    }

    // TODO IONIO: create segwit v1 address from scriptpubkey
    throw IONIO_NOT_SUPPORTED;
  }

  // get next address generate a new script and persist its details in cache
  // it also increments the account last used index depending on isInternal
  async getNextAddress(isInternal: boolean): Promise<string> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get next address');
    if (!this.name) throw new Error('No name, cannot get next address');

    const lastUsedIndexes = await this.getLastUsedIndexes();
    const lastUsed = isInternal ? lastUsedIndexes.internal : lastUsedIndexes.external;
    // TODO: persist script details
    const publicKeys = await this.deriveBatchPublicKeys(lastUsed, lastUsed + 1, isInternal);
    const type = await this.getAccountType();

    let address = undefined;
    let script = undefined;
    let scriptDetails = undefined;

    switch (type) {
      case AccountType.P2WPH:
        [script, scriptDetails] = this.createP2PWKHScript(publicKeys[0]);
        address = this.createP2WKHAddress(Buffer.from(script, 'hex'));
        break;
      case AccountType.Ionio:
        throw IONIO_NOT_SUPPORTED;
      default:
        throw new Error('Unsupported account type: ' + type);
    }

    if (!script || !scriptDetails) throw new Error('unable to derive new script');
    if (!address) throw new Error('unable to create address from script:' + script);

    // increment the account details last used index & persist the new script details
    await Promise.allSettled([
      this.walletRepository.updateAccountLastUsedIndexes(
        this.name,
        this.network.name as NetworkString,
        { [isInternal ? 'internal' : 'external']: lastUsed + 1 }),
      this.walletRepository.updateScriptDetails({
        [script]: scriptDetails
      })
    ]);

    return address;
  }

  async sync(gapLimit = GAP_LIMIT): Promise<{
    lastUsed: { internal: number; external: number };
  }> {
    if (!this.chainSource) throw new Error('No chain source, cannot sync');
    if (!this.walletRepository) throw new Error('No wallet repository, cannot sync');
    const type = await this.getAccountType();
    if (type !== AccountType.P2WPH) throw new Error('Unsupported sync function for account type: ' + type);

    const historyTxsId: Set<string> = new Set();
    const txidHeight: Map<string, number | undefined> = new Map();
    const restoredScripts: Record<string, ScriptDetails> = {};

    const lastUsed = await this.getLastUsedIndexes();

    const walletChains = [0, 1];
    for (const i of walletChains) {
      const isInternal = i === 1;
      let batchCount = isInternal ? lastUsed.internal : lastUsed.external;
      let unusedScriptCounter = 0;

      while (unusedScriptCounter <= gapLimit) {
        const publicKeys = await this.deriveBatchPublicKeys(batchCount, batchCount + gapLimit, isInternal);
        const scriptsWithDetails = publicKeys.map((publicKey) => this.createP2PWKHScript(publicKey));

        const scripts = scriptsWithDetails.map(([script]) => Buffer.from(script, 'hex'));
        const histories = await this.chainSource.fetchHistories(scripts);

        for (const [index, history] of histories.entries()) {
          if (history.length > 0) {
            unusedScriptCounter = 0; // reset counter
            restoredScripts[scriptsWithDetails[index][0]] = scriptsWithDetails[index][1];
            const newMaxIndex = index + batchCount + 1;
            if (isInternal) lastUsed.internal = newMaxIndex;
            else lastUsed.external = newMaxIndex;

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
      this.walletRepository.updateAccountLastUsedIndexes(
        this.name,
        this.network.name as NetworkString,
        lastUsed
      ),
      this.walletRepository.updateTxDetails(
        Object.fromEntries(
          Array.from(historyTxsId).map((txid) => [txid, { height: txidHeight.get(txid) }])
        )
      ),
      this.walletRepository.updateScriptDetails(restoredScripts),
    ]);

    return {
      lastUsed: {
        internal: lastUsed.internal,
        external: lastUsed.external,
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
  private async deriveBatchPublicKeys(
    start: number,
    end: number,
    isInternal: boolean,
  ): Promise<PubKeyWithRelativeDerivationPath[]> {
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

  private async getLastUsedIndexes(): Promise<{ internal: number; external: number }> {
    if (!this.walletRepository || !this.name) return { internal: 0, external: 0 };
    const { [this.name]: accountDetails } = await this.walletRepository.getAccountDetails(
      this.name
    );
    if (!accountDetails) return { internal: 0, external: 0 };
    const { lastUsedIndexes } = accountDetails;
    const net = this.network.name as NetworkString;
    if (!lastUsedIndexes || !lastUsedIndexes[net]) return { internal: 0, external: 0 };

    return {
      internal: lastUsedIndexes[net].internal || 0,
      external: lastUsedIndexes[net].external || 0,
    };
  }

  private async getAccountDetails(): Promise<AccountDetails> {
    const { [this.name]: accountDetails } = await this.walletRepository.getAccountDetails(this.name);
    this._cacheAccountType = accountDetails.accountType;
    if (!accountDetails) throw new Error('Account details not found');
    return accountDetails;
  }

  private async getAccountType(): Promise<AccountType> {
    if (!this._cacheAccountType) {
      const details = await this.getAccountDetails();
      return details.accountType;
    }
    return this._cacheAccountType;
  }

  private createP2PWKHScript(
    { publicKey, derivationPath }: PubKeyWithRelativeDerivationPath
  ): [string, ScriptDetails] {
    const script = payments.p2wpkh({ pubkey: publicKey, network: this.network }).output;
    if (!script) throw new Error('Could not derive script');
    return [script.toString('hex'), {
      derivationPath,
      accountName: this.name,
      network: this.network.name as NetworkString,
      blindingPrivateKey: this.deriveBlindingKey(script).privateKey.toString('hex'),
    }];
  }

  private createP2WKHAddress(script: Buffer): string {
    const { publicKey: blindkey } = this.deriveBlindingKey(script);
    const address = payments.p2wpkh({
      output: script,
      network: this.network,
      blindkey,
    }).confidentialAddress;
    if (!address) throw new Error('Could not derive address');
    return address;
  }

  // private createIonioScript(
  //   { publicKey, derivationPath }: PubKeyWithRelativeDerivationPath, 
  //   artifact: Artifact,
  //   params: Argument[]
  // ): [string, ScriptDetails] {
  //   const contract = new Contract(artifact, params, this.network, { ecc, zkp });
  // }


}
