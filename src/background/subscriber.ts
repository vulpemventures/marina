import type { NetworkString } from 'marina-provider';
import type { WalletRepository, AppRepository } from '../domain/repository';
import type { ChainSource } from '../domain/chainsource';

const ChainSourceError = (network: string) =>
  new Error('Chain source not found, cannot start subscriber service on network: ' + network);

// subscriber manages the subscription for all the accounts
export class SubscriberService {
  private chainSource: ChainSource | null = null;
  private subscribedScripts = new Set<string>();
  private network: NetworkString | null = null;

  constructor(private walletRepository: WalletRepository, private appRepository: AppRepository) {}

  async start() {
    const network = await this.appRepository.getNetwork();
    if (!network) throw new Error('no network selected');
    this.network = network;

    const chainSource = await this.appRepository.getChainSource();
    if (chainSource === null) {
      throw ChainSourceError('unknown');
    }
    this.chainSource = chainSource;

    await this.initSubscribtions();

    this.appRepository.onNetworkChanged(async (network: NetworkString) => {
      try {
        await this.unsubscribe();
        await this.chainSource?.close();
      } catch (e) {
        console.error('error while unsubscribing', e);
      }
      this.network = network;
      this.chainSource = await this.appRepository.getChainSource(network);
      if (!this.chainSource) throw ChainSourceError(network);
      await this.initSubscribtions();
    });

    this.walletRepository.onNewScript(async (script: string) => {
      await this.subscribeScript(script);
    });
  }

  async stop() {
    await Promise.allSettled(
      Array.from(this.subscribedScripts).map((s) =>
        this.chainSource?.unsubscribeScriptStatus(Buffer.from(s, 'hex'))
      )
    );
    await this.chainSource?.close();
  }

  private async initSubscribtions() {
    const network = await this.appRepository.getNetwork();
    if (!network) throw new Error('cannot init subscriptions, no network selected');
    const accounts = await this.walletRepository.getAccountDetails();

    const accountsFiltered = [];
    for (const [name, details] of Object.entries(accounts)) {
      if (!details.accountNetworks.includes(network)) continue;
      accountsFiltered.push(name);
    }

    const scriptsDetails = await this.walletRepository.getAccountScripts(
      network,
      ...accountsFiltered
    );
    await Promise.all(Object.keys(scriptsDetails).map((s) => this.subscribeScript(s)));
  }

  private async subscribeScript(script: string) {
    if (this.subscribedScripts.has(script)) return;
    this.subscribedScripts.add(script);
    const scriptBuff = Buffer.from(script, 'hex');
    await this.chainSource?.subscribeScriptStatus(
      scriptBuff,
      async (_: string, status: string | null) => {
        if (status === null) return;
        const history = await this.chainSource?.fetchHistories([scriptBuff]);
        if (!history) return;
        const historyTxId = history[0].map(({ tx_hash }) => tx_hash);
        await Promise.all([
          this.walletRepository.addTransactions(this.network as NetworkString, ...historyTxId),
          this.walletRepository.updateTxDetails(
            Object.fromEntries(history[0].map(({ tx_hash, height }) => [tx_hash, { height }]))
          ),
        ]);
      }
    );
  }

  private async unsubscribe() {
    await Promise.all(
      Array.from(this.subscribedScripts).map((s) =>
        this.chainSource?.unsubscribeScriptStatus(Buffer.from(s, 'hex'))
      )
    );
    this.subscribedScripts = new Set<string>();
  }
}
