import * as ecc from 'tiny-secp256k1';
import type { BIP32Interface } from 'bip32';
import BIP32Factory from 'bip32';
import { networks, payments } from 'liquidjs-lib';
import type { NetworkString } from 'marina-provider';
import type { Slip77Interface } from 'slip77';
import { SLIP77Factory } from 'slip77';
import type { ChainSource } from '../domain/chainsource';
import type { AppRepository, WalletRepository } from '../infrastructure/repository';

const bip32 = BIP32Factory(ecc);
const slip77 = SLIP77Factory(ecc);

const GAP_LIMIT = 20;

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

  deriveBlindingKey(script: Buffer): { publicKey: Buffer; privateKey: Buffer } {
    if (!this.blindingKeyNode)
      throw new Error('No blinding key node, Account cannot derive blinding key');
    const derived = this.blindingKeyNode.derive(script);
    if (!derived.publicKey || !derived.privateKey) throw new Error('Could not derive blinding key');
    return { publicKey: derived.publicKey, privateKey: derived.privateKey };
  }

  // Derive a range from start to end index of public keys applying the base derivation path
  async deriveBatch(
    start: number,
    end: number,
    isInternal: boolean,
    updateCache = true
  ): Promise<Buffer[]> {
    if (!this.node) throw new Error('No node, Account cannot derive scripts');
    const chain = isInternal ? 1 : 0;
    const scripts = [];
    for (let i = start; i < end; i++) {
      const child = this.node.derive(chain).derive(i);
      const p2wpkh = payments.p2wpkh({ pubkey: child.publicKey, network: this.network });
      const script = p2wpkh.output;
      if (!script) continue;
      scripts.push(script);
    }

    if (this.walletRepository && updateCache) {
      // persist the script details in the wallet repository
      await this.walletRepository.updateScriptDetails(
        Object.fromEntries(
          scripts.map((script) => [
            script.toString('hex'),
            {
              accountName: this.name,
              network: this.network.name as NetworkString,
              derivationPath: `m/${chain}/${start}`,
              blindingPrivateKey: this.deriveBlindingKey(script).privateKey.toString('hex'),
            },
          ])
        )
      );
    }

    return scripts;
  }

  async getAllAddresses(): Promise<string[]> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get all addresses');
    if (!this.name) throw new Error('No name, cannot get all addresses');
    const { internal, external } = await this.getLastUsedIndexes();
    const externalScripts = await this.deriveBatch(0, external, false, false);
    const internalScripts = await this.deriveBatch(0, internal, true, false);
    const scripts = [...externalScripts, ...internalScripts];
    const addresses = scripts.map((script) => {
      const { publicKey } = this.deriveBlindingKey(script);
      return payments.p2wpkh({ output: script, network: this.network, blindkey: publicKey })
        .address!;
    });
    return addresses;
  }

  // get next address generate a new script and persist its details in cache
  // it also increments the account last used index depending on isInternal
  async getNextAddress(isInternal: boolean): Promise<string> {
    if (!this.walletRepository) throw new Error('No wallet repository, cannot get next address');
    if (!this.name) throw new Error('No name, cannot get next address');

    const lastUsedIndexes = await this.getLastUsedIndexes();
    const lastUsed = isInternal ? lastUsedIndexes.internal : lastUsedIndexes.external;
    const scripts = await this.deriveBatch(lastUsed, lastUsed + 1, isInternal);
    const script = scripts[0];
    const { publicKey } = this.deriveBlindingKey(script);
    const address = payments.p2wpkh({
      output: script,
      network: this.network,
      blindkey: publicKey,
    }).address;
    if (!address) throw new Error('Could not derive address');
    // increment the account details
    await this.walletRepository.updateAccountLastUsedIndexes(
      this.name,
      this.network.name as NetworkString,
      { [isInternal ? 'internal' : 'external']: lastUsed + 1 }
    );

    return address;
  }

  async sync(gapLimit = GAP_LIMIT): Promise<{
    lastUsed: { internal: number; external: number };
  }> {
    if (!this.chainSource) throw new Error('No chain source, cannot sync');
    if (!this.walletRepository) throw new Error('No wallet repository, cannot sync');
    if (!this.name) throw new Error('No name, cannot sync');

    const historyTxsId: Set<string> = new Set();
    const heightsSet: Set<number> = new Set();
    const txidHeight: Map<string, number | undefined> = new Map();

    const lastUsed = await this.getLastUsedIndexes();

    const walletChains = [0, 1];
    for (const i of walletChains) {
      const isInternal = i === 1;
      let batchCount = isInternal ? lastUsed.internal : lastUsed.external;
      let unusedScriptCounter = 0;

      while (unusedScriptCounter < gapLimit) {
        const scripts = await this.deriveBatch(
          batchCount,
          batchCount + gapLimit,
          isInternal,
          false
        );
        const histories = await this.chainSource.fetchHistories(scripts);
        console.log('histories', histories, 'for scripts', scripts, 'isInternal', isInternal);
        for (const [index, history] of histories.entries()) {
          if (history.length > 0) {
            unusedScriptCounter = 0; // reset counter
            const newMaxIndex = index + batchCount;
            if (isInternal) lastUsed.internal = newMaxIndex;
            else lastUsed.external = newMaxIndex;

            // update the history set
            for (const { tx_hash, height } of history) {
              historyTxsId.add(tx_hash);
              if (height !== undefined) heightsSet.add(height);
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
    ]);
    // fetch the unspents
    const scripts = await this.deriveBatch(0, lastUsed.external, false, true);
    const internalScripts = await this.deriveBatch(0, lastUsed.internal, true, true);
    const scriptToUpdate = [...scripts, ...internalScripts];
    const unspents = await this.chainSource.fetchUnspentOutputs(scriptToUpdate);
    await this.walletRepository.updateScriptUnspents(
      Object.fromEntries(
        unspents
          .filter((ls) => ls.length > 0)
          .map((utxos, index) => [scriptToUpdate[index].toString('hex'), utxos])
      )
    );

    return {
      lastUsed: {
        internal: lastUsed.internal,
        external: lastUsed.external,
      },
    };
  }

  // subscribe to addresses in a range
  async subscribeBatch(start: number, end: number, isInternal: boolean): Promise<void> {
    const scripts = await this.deriveBatch(start, end, isInternal, false);
    for (const script of scripts) {
      await this.chainSource.subscribeScriptStatus(
        script,
        async (_: string, status: string | null) => {
          const history = await this.chainSource.fetchHistories([script]);
          const historyTxId = history[0].map(({ tx_hash }) => tx_hash);

          await Promise.all([
            this.walletRepository.addTransactions(
              this.network.name as NetworkString,
              ...historyTxId
            ),
            this.walletRepository.updateTxDetails(
              Object.fromEntries(history[0].map(({ tx_hash, height }) => [tx_hash, { height }]))
            ),
          ]);

          const unspents = await this.chainSource.fetchUnspentOutputs([script]);
          const unspentForScript = unspents[0];
          await this.walletRepository.updateScriptUnspents({
            [script.toString('hex')]: unspentForScript,
          });
        }
      );
    }
  }

  async unsubscribeBatch(start: number, end: number, isInternal: boolean): Promise<void> {
    const scripts = await this.deriveBatch(start, end, isInternal, false);
    for (const script of scripts) {
      await this.chainSource.unsubscribeScriptStatus(script);
    }
  }

  async subscribeAllScripts(): Promise<void> {
    const lastUsed = await this.getLastUsedIndexes();
    const walletChains = [0, 1];
    for (const i of walletChains) {
      const isInternal = i === 1;
      const lastUsedIndex = isInternal ? lastUsed.internal : lastUsed.external;
      await this.subscribeBatch(0, lastUsedIndex, isInternal);
    }
  }

  async unsubscribeAllScripts(): Promise<void> {
    const lastUsed = await this.getLastUsedIndexes();
    const walletChains = [0, 1];
    for (const i of walletChains) {
      const isInternal = i === 1;
      const batchCount = isInternal ? lastUsed.internal : lastUsed.external;
      await this.unsubscribeBatch(batchCount, batchCount + GAP_LIMIT, isInternal);
    }
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
}
