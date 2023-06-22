import type { Asset, NetworkString } from 'marina-provider';
import type { LoadingValue, PresentationCache, Presenter } from '../domain/presenter';
import type {
  AppRepository,
  AssetRepository,
  BlockheadersRepository,
  WalletRepository,
} from '../domain/repository';
import type { TxDetails } from '../domain/transaction';
import { computeBalances, computeTxDetailsExtended } from '../domain/transaction';
import type { BlockHeader } from '../domain/chainsource';
import { MainAccount, MainAccountLegacy, MainAccountTest } from './account';

function createLoadingValue<T>(value: T): LoadingValue<T> {
  return {
    value,
    loading: false,
  };
}

const setValue = <T>(value: T): LoadingValue<T> => ({
  loading: false,
  value,
});

const setLoading = <T>(loadingValue: LoadingValue<T>): LoadingValue<T> => ({
  ...loadingValue,
  loading: true,
});

export class PresenterImpl implements Presenter {
  private state: PresentationCache = {
    network: 'liquid',
    authenticated: createLoadingValue(false),
    balances: createLoadingValue({}),
    utxos: createLoadingValue([]),
    assetsDetails: createLoadingValue<Record<string, Asset>>({}),
    transactions: createLoadingValue([]),
    blockHeaders: createLoadingValue<Record<number, BlockHeader>>({}),
    walletAssets: createLoadingValue(new Set()),
  };
  private closeFunction: (() => void) | null = null;

  constructor(
    private appRepository: AppRepository,
    private walletRepository: WalletRepository,
    private assetsRepository: AssetRepository,
    private blockHeadersRepository: BlockheadersRepository
  ) {}

  stop() {
    if (this.closeFunction) {
      this.closeFunction();
      this.closeFunction = null;
    }
  }

  async present(emits: (cache: PresentationCache) => void) {
    this.state = {
      ...this.state,
      authenticated: setLoading(this.state.authenticated),
      balances: setLoading(this.state.balances),
      utxos: setLoading(this.state.utxos),
      assetsDetails: setLoading(this.state.assetsDetails),
      transactions: setLoading(this.state.transactions),
      walletAssets: setLoading(this.state.walletAssets),
      blockHeaders: setLoading(this.state.blockHeaders),
    };
    emits(this.state);

    this.state = await this.updateNetwork();
    this.state = await this.updateAuthenticated();
    emits(this.state);
    this.state = await this.updateUtxos();
    this.state = await this.updateBalances();
    emits(this.state);
    this.state = await this.updateAssets();
    emits(this.state);
    this.state = await this.updateTransactions();
    emits(this.state);
    this.state = await this.updateBlockHeaders();
    emits(this.state);

    const closeFns: (() => void)[] = [];

    closeFns.push(
      this.blockHeadersRepository.onNewBlockHeader((network, blockHeader) => {
        if (network !== this.state.network) return Promise.resolve();
        if (blockHeader && blockHeader.height !== undefined) {
          this.state = {
            ...this.state,
            blockHeaders: setValue({
              ...this.state.blockHeaders.value,
              [blockHeader.height]: blockHeader,
            }),
          };
          emits(this.state);
        }
        return Promise.resolve();
      })
    );

    closeFns.push(
      this.appRepository.onNetworkChanged(async () => {
        this.state = await this.updateNetwork();
        this.state = {
          ...this.state,
          balances: setLoading(this.state.balances),
          utxos: setLoading(this.state.utxos),
          assetsDetails: setLoading(this.state.assetsDetails),
          blockHeaders: setLoading(this.state.blockHeaders),
          transactions: setLoading(this.state.transactions),
          walletAssets: setLoading(this.state.walletAssets),
        };
        emits(this.state);

        this.state = await this.updateUtxos();
        this.state = await this.updateBalances();
        emits(this.state);
        this.state = await this.updateAssets();
        emits(this.state);
        this.state = await this.updateTransactions();
        emits(this.state);
        this.state = await this.updateBlockHeaders();
        emits(this.state);
      })
    );

    closeFns.push(
      this.appRepository.onIsAuthenticatedChanged(async (authenticated) => {
        this.state = {
          ...this.state,
          authenticated: setValue(authenticated),
        };
        emits(this.state);
        return Promise.resolve();
      })
    );

    closeFns.push(
      this.walletRepository.onNewTransaction(async (txID: string, details: TxDetails) => {
        if (!this.state.authenticated.value) return;
        const scripts = await this.walletRepository.getAccountScripts(
          this.state.network,
          MainAccountLegacy,
          this.state.network === 'liquid' ? MainAccount : MainAccountTest
        );

        const found = this.state.transactions.value.findIndex((tx) => tx.txid === txID);
        if (found > -1) return; // skip if tx already present

        const extendedTxDetails = await computeTxDetailsExtended(
          this.appRepository,
          this.walletRepository,
          scripts
        )(details);

        this.state = {
          ...this.state,
          transactions: setValue(
            [extendedTxDetails, ...this.state.transactions.value].sort(sortTxDetails)
          ),
          walletAssets: setValue(
            new Set([...this.state.walletAssets.value, ...Object.keys(extendedTxDetails.txFlow)])
          ),
        };

        emits(this.state);
      })
    );

    closeFns.push(
      this.assetsRepository.onNewAsset((asset) => {
        if (!this.state.authenticated.value) return Promise.resolve();
        this.state = {
          ...this.state,
          assetsDetails: setValue({ ...this.state.assetsDetails.value, [asset.assetHash]: asset }),
        };
        emits(this.state);
        return Promise.resolve();
      })
    );

    closeFns.push(
      ...['liquid', 'testnet', 'regtest']
        .map((network) => [
          this.walletRepository.onNewUtxo(network as NetworkString)(
            async ({ txid, vout, blindingData }) => {
              if (!this.state.authenticated.value) return;
              if (network !== this.state.network) return;
              this.state = {
                ...this.state,
                utxos: setValue([...this.state.utxos.value, { txid, vout, blindingData }]),
              };
              this.state = await this.updateBalances();
              emits(this.state);
            }
          ),
          this.walletRepository.onDeleteUtxo(network as NetworkString)(async ({ txid, vout }) => {
            if (!this.state.authenticated.value) return;
            if (network !== this.state.network) return;
            this.state = {
              ...this.state,
              utxos: setValue(
                this.state.utxos.value.filter((utxo) => utxo.txid !== txid || utxo.vout !== vout)
              ),
            };
            this.state = await this.updateBalances();
            emits(this.state);
          }),
        ])
        .flat()
    );

    closeFns.push(
      this.walletRepository.onUnblindingEvent(async ({ txid, vout, blindingData }) => {
        if (!this.state.authenticated.value) return;
        if (this.state.utxos.value.find((utxo) => utxo.txid === txid && utxo.vout === vout)) {
          this.state = {
            ...this.state,
            utxos: setValue(
              this.state.utxos.value.map((utxo) =>
                utxo.txid === txid && utxo.vout === vout ? { txid, vout, blindingData } : utxo
              )
            ),
          };
          emits(this.state);
          this.state = await this.updateBalances();
          emits(this.state);
        }
        this.state = await this.updateTransactions();
        emits(this.state);
      })
    );

    this.closeFunction = () => {
      closeFns.forEach((fn) => fn());
    };
  }

  private async updateNetwork(): Promise<PresentationCache> {
    const network = await this.appRepository.getNetwork();
    if (!network) return this.state;
    return {
      ...this.state,
      network,
    };
  }

  private async updateAuthenticated(): Promise<PresentationCache> {
    const { isAuthenticated } = await this.appRepository.getStatus();
    return {
      ...this.state,
      authenticated: setValue(isAuthenticated),
    };
  }

  private async updateUtxos(): Promise<PresentationCache> {
    const utxos = await this.walletRepository.getUtxos(this.state.network);
    return {
      ...this.state,
      utxos: setValue(utxos),
    };
  }

  private async updateBalances(): Promise<PresentationCache> {
    return Promise.resolve({
      ...this.state,
      balances: setValue(computeBalances(this.state.utxos.value)),
    });
  }

  private async updateAssets(): Promise<PresentationCache> {
    const assets = await this.assetsRepository.getAllAssets(this.state.network);
    return {
      ...this.state,
      assetsDetails: setValue(Object.fromEntries(assets.map((asset) => [asset.assetHash, asset]))),
    };
  }

  private async updateTransactions(): Promise<PresentationCache> {
    const transactions = await this.walletRepository.getTransactions(this.state.network);
    const details = await this.walletRepository.getTxDetails(...transactions);
    const scripts = await this.walletRepository.getAccountScripts(
      this.state.network,
      MainAccountLegacy,
      this.state.network === 'liquid' ? MainAccount : MainAccountTest
    );
    const extendedTxDetails = await Promise.all(
      Object.values(details).map(
        computeTxDetailsExtended(this.appRepository, this.walletRepository, scripts)
      )
    );
    const assetsInTransactions = extendedTxDetails.reduce(
      (acc, tx) => [...acc, ...Object.keys(tx.txFlow)],
      [] as string[]
    );
    return {
      ...this.state,
      transactions: setValue(extendedTxDetails.sort(sortTxDetails)),
      walletAssets: setValue(new Set(assetsInTransactions)),
    };
  }

  private async updateBlockHeaders(): Promise<PresentationCache> {
    const blockHeaders = await this.blockHeadersRepository.getAllBlockHeaders(this.state.network);

    return {
      ...this.state,
      blockHeaders: setValue(blockHeaders),
    };
  }
}

// sort function for txDetails, use the height member to sort
// put unconfirmed txs first and then sort by height (desc)
function sortTxDetails(a: TxDetails, b: TxDetails): number {
  if (a.height === b.height) return 0;
  if (!a.height || a.height === -1) return -1;
  if (!b.height || b.height === -1) return 1;
  return b.height - a.height;
}
