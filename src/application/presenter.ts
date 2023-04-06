import { NetworkString } from 'marina-provider';
import { LoadingValue, PresentationCache, Presenter } from '../domain/presenter';
import { AppRepository, AssetRepository, WalletRepository } from '../domain/repository';
import { computeBalances, computeTxDetailsExtended, TxDetails } from '../domain/transaction';

const createLoadingValue = <T>(value: T): LoadingValue<T> => ({
  value,
  loading: false,
});

const setValue = <T>(loadingValue: LoadingValue<T>, value: T): LoadingValue<T> => ({
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
    assets: createLoadingValue([]),
    transactions: createLoadingValue([]),
  };

  constructor(
    private appRepository: AppRepository,
    private walletRepository: WalletRepository,
    private assetsRepository: AssetRepository
  ) {}

  async present(emits: (cache: PresentationCache) => void): Promise<() => void> {
    this.state = {
      ...this.state,
      authenticated: setLoading(this.state.authenticated),
      balances: setLoading(this.state.balances),
      utxos: setLoading(this.state.utxos),
      assets: setLoading(this.state.assets),
      transactions: setLoading(this.state.transactions),
    };
    emits(this.state);

    this.state = await this.updateNetwork();
    emits(this.state);
    this.state = await this.updateAuthenticated();
    emits(this.state);
    this.state = await this.updateUtxos();
    emits(this.state);
    this.state = await this.updateBalances();
    emits(this.state);
    this.state = await this.updateAssets();
    emits(this.state);
    this.state = await this.updateTransactions();
    emits(this.state);

    const closeFns: (() => void)[] = [];

    closeFns.push(
      this.appRepository.onNetworkChanged(async () => {
        this.state = await this.updateNetwork();
        this.state = {
          ...this.state,
          balances: setLoading(this.state.balances),
          utxos: setLoading(this.state.utxos),
          assets: setLoading(this.state.assets),
          transactions: setLoading(this.state.transactions),
        };
        emits(this.state);

        this.state = await this.updateUtxos();
        this.state = await this.updateBalances();
        emits(this.state);
        this.state = await this.updateAssets();
        emits(this.state);
        this.state = await this.updateTransactions();
        emits(this.state);
      })
    );

    closeFns.push(
      this.appRepository.onIsAuthenticatedChanged(async () => {
        this.state = await this.updateAuthenticated();
        emits(this.state);
      })
    );

    closeFns.push(
      this.walletRepository.onNewTransaction(async (_, details: TxDetails) => {
        this.state = await this.updateUtxos();
        emits(this.state);
        this.state = await this.updateBalances();
        emits(this.state);
        const extendedTxDetails = await computeTxDetailsExtended(
          this.appRepository,
          this.walletRepository
        )(details);
        this.state = {
          ...this.state,
          transactions: setValue(
            this.state.transactions,
            [extendedTxDetails, ...this.state.transactions.value].sort(sortTxDetails)
          ),
        };
      })
    );

    closeFns.push(
      ...['liquid', 'testnet', 'regtest']
        .map((network) => [
          this.walletRepository.onNewUtxo(network as NetworkString)(
            async ({ txID, vout, blindingData }) => {
              if (network !== this.state.network) return;
              this.state = {
                ...this.state,
                utxos: setValue(this.state.utxos, [
                  ...this.state.utxos.value,
                  { txID, vout, blindingData },
                ]),
              };
              this.state = await this.updateBalances();
              emits(this.state);
            }
          ),
          this.walletRepository.onDeleteUtxo(network as NetworkString)(async ({ txID, vout }) => {
            if (network !== this.state.network) return;
            this.state = {
              ...this.state,
              utxos: setValue(
                this.state.utxos,
                this.state.utxos.value.filter((utxo) => utxo.txID !== txID || utxo.vout !== vout)
              ),
            };
            this.state = await this.updateBalances();
            emits(this.state);
          }),
        ])
        .flat()
    );

    closeFns.push(
      this.walletRepository.onUnblindingEvent(async ({ txID, vout, blindingData }) => {
        if (this.state.utxos.value.find((utxo) => utxo.txID === txID && utxo.vout === vout)) {
          this.state = {
            ...this.state,
            utxos: setValue(
              this.state.utxos,
              this.state.utxos.value.map((utxo) =>
                utxo.txID === txID && utxo.vout === vout ? { txID, vout, blindingData } : utxo
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

    return () => {
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
      authenticated: setValue(this.state.authenticated, isAuthenticated),
    };
  }

  private async updateUtxos(): Promise<PresentationCache> {
    const utxos = await this.walletRepository.getUtxos(this.state.network);
    return {
      ...this.state,
      utxos: setValue(this.state.utxos, utxos),
    };
  }

  private async updateBalances(): Promise<PresentationCache> {
    return {
      ...this.state,
      balances: setValue(this.state.balances, computeBalances(this.state.utxos.value)),
    };
  }

  private async updateAssets(): Promise<PresentationCache> {
    const assets = await this.assetsRepository.getAllAssets(this.state.network);
    return {
      ...this.state,
      assets: setValue(this.state.assets, assets),
    };
  }

  private async updateTransactions(): Promise<PresentationCache> {
    const transactions = await this.walletRepository.getTransactions(this.state.network);
    const details = await this.walletRepository.getTxDetails(...transactions);
    const extendedTxDetails = await Promise.all(
      Object.values(details).map(
        computeTxDetailsExtended(this.appRepository, this.walletRepository)
      )
    );
    return {
      ...this.state,
      transactions: setValue(this.state.transactions, extendedTxDetails),
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
