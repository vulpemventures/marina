import type { Asset, NetworkString } from 'marina-provider';
import type { LoadingValue, PresentationCache, Presenter } from '../domain/presenter';
import type { AppRepository, AssetRepository, WalletRepository } from '../domain/repository';
import type { TxDetails } from '../domain/transaction';
import { computeBalances, computeTxDetailsExtended } from '../domain/transaction';
import { FEATURED_ASSETS } from '../domain/constants';

const createLoadingValue = <T>(value: T): LoadingValue<T> => ({
  value,
  loading: false,
});

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
    assets: createLoadingValue([]),
    transactions: createLoadingValue([]),
  };
  private closeFunction: (() => void) | null = null;

  constructor(
    private appRepository: AppRepository,
    private walletRepository: WalletRepository,
    private assetsRepository: AssetRepository
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
      assets: setLoading(this.state.assets),
      transactions: setLoading(this.state.transactions),
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
      this.walletRepository.onNewTransaction(async (_, details: TxDetails) => {
        if (!this.state.authenticated.value) return;
        const extendedTxDetails = await computeTxDetailsExtended(
          this.appRepository,
          this.walletRepository
        )(details);
        this.state = {
          ...this.state,
          transactions: setValue(
            [extendedTxDetails, ...this.state.transactions.value].sort(sortTxDetails)
          ),
        };
      })
    );

    closeFns.push(
      this.assetsRepository.onNewAsset((asset) => {
        if (!this.state.authenticated.value) return Promise.resolve();
        const existingState = this.state.assets.value.find((a) => a.assetHash === asset.assetHash);
        if (existingState) {
          if (existingState.name === asset.name && existingState.ticker === asset.ticker)
            return Promise.resolve();
          this.state = {
            ...this.state,
            assets: setValue(
              this.state.assets.value.map((a) => (a.assetHash === asset.assetHash ? asset : a))
            ),
          };
          emits(this.state);
          return Promise.resolve();
        }

        this.state = {
          ...this.state,
          assets: setValue([...this.state.assets.value, asset]),
        };
        emits(this.state);
        return Promise.resolve();
      })
    );

    closeFns.push(
      ...['liquid', 'testnet', 'regtest']
        .map((network) => [
          this.walletRepository.onNewUtxo(network as NetworkString)(
            async ({ txID, vout, blindingData }) => {
              if (!this.state.authenticated.value) return;
              if (network !== this.state.network) return;
              this.state = {
                ...this.state,
                utxos: setValue([...this.state.utxos.value, { txID, vout, blindingData }]),
              };
              this.state = await this.updateBalances();
              emits(this.state);
            }
          ),
          this.walletRepository.onDeleteUtxo(network as NetworkString)(async ({ txID, vout }) => {
            if (!this.state.authenticated.value) return;
            if (network !== this.state.network) return;
            this.state = {
              ...this.state,
              utxos: setValue(
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
        if (!this.state.authenticated.value) return;
        if (this.state.utxos.value.find((utxo) => utxo.txID === txID && utxo.vout === vout)) {
          this.state = {
            ...this.state,
            utxos: setValue(
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
      assets: setValue(sortAssets(assets)),
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
      transactions: setValue(extendedTxDetails.sort(sortTxDetails)),
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

/**
 * Takes a list of assets, and sort it by the following criteria:
 * - first, featured assets order by L-BTC, USDT and LCAD
 * - all remaining assets in no particular order
 * @param assets list of assets in no particular order
 * @returns assets sorted by criteria defined above
 */
function sortAssets(assets: Asset[]): Asset[] {
  let newAsset;
  const newAssetTicker = 'Any';
  const featuredAssets: Asset[] = [];
  const remainingAssets = [];
  for (const asset of assets) {
    if (FEATURED_ASSETS.includes(asset.assetHash)) {
      featuredAssets.push(asset);
      continue;
    }
    if (asset.ticker === newAssetTicker) {
      newAsset = asset;
    } else {
      remainingAssets.push(asset);
    }
  }
  // join the two sets of assets and add 'Any' at the end of the list if it exists
  const sortedAssets = [...featuredAssets, ...remainingAssets];
  if (newAsset) sortedAssets.push(newAsset);
  return sortedAssets;
}
