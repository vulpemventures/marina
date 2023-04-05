import type { Asset, NetworkString } from 'marina-provider';
import type { SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type {
  AppRepository,
  AssetRepository,
  BlockheadersRepository,
  OnboardingRepository,
  SendFlowRepository,
  TaxiRepository,
  WalletRepository,
} from '../../domain/repository';
import type { TxDetails, TxDetailsExtended, UnblindedOutput } from '../../domain/transaction';
import { computeTxDetailsExtended, computeBalances } from '../../domain/transaction';
import { AppStorageAPI } from '../../infrastructure/storage/app-repository';
import { AssetStorageAPI } from '../../infrastructure/storage/asset-repository';
import { BlockHeadersAPI } from '../../infrastructure/storage/blockheaders-repository';
import { OnboardingStorageAPI } from '../../infrastructure/storage/onboarding-repository';
import { SendFlowStorageAPI } from '../../infrastructure/storage/send-flow-repository';
import { TaxiStorageAPI } from '../../infrastructure/storage/taxi-repository';
import { WalletStorageAPI } from '../../infrastructure/storage/wallet-repository';
import { sortAssets } from '../utility/sort';
import { DefaultAssetRegistry } from '../../port/asset-registry';

const walletRepository = new WalletStorageAPI();
const appRepository = new AppStorageAPI();
const assetRepository = new AssetStorageAPI(walletRepository);
const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
const onboardingRepository = new OnboardingStorageAPI();
const sendFlowRepository = new SendFlowStorageAPI();
const blockHeadersRepository = new BlockHeadersAPI();

interface AsyncValue<T> {
  value: T;
  loading: boolean;
  setValue: (value: SetStateAction<T>) => void;
  setLoading: (loading: boolean) => void;
}

function useAsyncValue<T>(initialValue: T): AsyncValue<T> {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  return {
    value,
    loading,
    setValue,
    setLoading,
  };
}

interface StorageContextCache {
  network: NetworkString;
  authenticated: AsyncValue<boolean>;
  balances: AsyncValue<Record<string, number>>;
  utxos: AsyncValue<UnblindedOutput[]>;
  assets: AsyncValue<Asset[]>;
  transactions: AsyncValue<TxDetailsExtended[]>;
}

interface StorageContextProps {
  walletRepository: WalletRepository;
  appRepository: AppRepository;
  assetRepository: AssetRepository;
  taxiRepository: TaxiRepository;
  onboardingRepository: OnboardingRepository;
  sendFlowRepository: SendFlowRepository;
  blockHeadersRepository: BlockheadersRepository;
  cache?: StorageContextCache;
}

const StorageContext = createContext<StorageContextProps>({
  walletRepository,
  appRepository,
  assetRepository,
  taxiRepository,
  onboardingRepository,
  sendFlowRepository,
  blockHeadersRepository,
});

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const [network, setNetwork] = useState<NetworkString>('liquid');
  const authenticated = useAsyncValue<boolean>(false);
  const balances = useAsyncValue<Record<string, number>>({});
  const utxos = useAsyncValue<UnblindedOutput[]>([]);
  const assets = useAsyncValue<Asset[]>([]);
  const transactions = useAsyncValue<TxDetailsExtended[]>([]);

  const [closeUtxosListeners, setCloseUtxosListenersFunction] = useState<() => void>();
  const [closeTxListener, setCloseTxListener] = useState<() => void>();

  // utxos & balances update on network change
  useEffect(() => {
    const updateUtxosAndBalances = async () => {
      setUtxosListeners(network);
      const fromRepo = await walletRepository.getUtxos(network);
      utxos.setValue(fromRepo);
      balances.setValue(computeBalances(fromRepo));
    };

    if (!network) return;
    utxos.setLoading(true);
    balances.setLoading(true);
    updateUtxosAndBalances()
      .catch(console.error)
      .finally(() => {
        utxos.setLoading(false);
        balances.setLoading(false);
      });
  }, [network]);

  // asset update on network change
  useEffect(() => {
    const updateAssets = async () => {
      const assetRegistry = new DefaultAssetRegistry(network);
      const assetsFromRepo = await assetRepository.getAllAssets(network);
      assets.setValue(sortAssets(assetsFromRepo));
      try {
        const assetsWithUnknownDetails = assetsFromRepo.filter(
          ({ ticker, assetHash }) => ticker === assetHash.substring(0, 4)
        );
        const newAssetDetails = await Promise.all(
          assetsWithUnknownDetails.map(({ assetHash }) => assetRegistry.getAsset(assetHash))
        );
        await Promise.allSettled(
          newAssetDetails.map((asset) => assetRepository.addAsset(asset.assetHash, asset))
        );
        assets.setValue(sortAssets(await assetRepository.getAllAssets(network)));
      } catch (e) {
        console.warn('failed to update asset details from registry', e);
      }
    };
    if (!network) return;
    assets.setLoading(true);
    updateAssets()
      .catch(console.error)
      .finally(() => assets.setLoading(false));
  }, [network]);

  // transactions update on network change
  useEffect(() => {
    const updateTransactions = async () => {
      setTransactionsListener(network);
      // transactions
      const txIds = await walletRepository.getTransactions(network);
      const details = await walletRepository.getTxDetails(...txIds);
      const txDetails = Object.values(details).sort(sortTxDetails());
      await Promise.allSettled(
        txDetails
          .filter((tx) => tx.hex !== undefined)
          .map(computeTxDetailsExtended(appRepository, walletRepository, blockHeadersRepository))
          .map((p) =>
            p
              .then((tx) => {
                transactions.setValue((txs) => [...txs, tx]);
                return tx;
              })
              .catch(console.error)
          )
      );
    };

    const fetchTransactionsHexes = async () => {
      const txIds = await walletRepository.getTransactions(network);
      const details = await walletRepository.getTxDetails(...txIds);
      // check if we have the hex, if not fetch it
      const chainSource = await appRepository.getChainSource();
      if (chainSource) {
        const txIDs = Object.entries(details)
          .filter(([, details]) => !details.hex)
          .map(([txID]) => txID);
        const txs = await chainSource.fetchTransactions(txIDs);
        await walletRepository.updateTxDetails(Object.fromEntries(txs.map((tx) => [tx.txID, tx])));
        await chainSource.close();
      }
    };

    if (!network) return;
    transactions.setLoading(true);
    updateTransactions()
      .catch(console.error)
      .finally(() => transactions.setLoading(false));

    fetchTransactionsHexes().catch(console.error);
  }, [network]);

  // use the repositories listeners to update the state and the balances while the utxos change
  const setUtxosListeners = (network: NetworkString) => {
    closeUtxosListeners?.();
    const closeOnNewUtxoListener = walletRepository.onNewUtxo(network)(async (_) => {
      const fromRepo = await walletRepository.getUtxos(network);
      utxos.setValue(fromRepo);
      balances.setValue(computeBalances(fromRepo));
    });

    const closeOnDeleteUtxoListener = walletRepository.onDeleteUtxo(network)(async (_) => {
      const fromRepo = await walletRepository.getUtxos(network);
      utxos.setValue(fromRepo);
      balances.setValue(computeBalances(fromRepo));
    });

    // set up the close function for the utxos listeners
    // we need this cause we reload the listener when the network changes
    setCloseUtxosListenersFunction(() => () => {
      closeOnNewUtxoListener?.();
      closeOnDeleteUtxoListener?.();
    });
  };

  const setTransactionsListener = (network: NetworkString) => {
    closeTxListener?.();
    const closeOnNewTransactionListener = walletRepository.onNewTransaction(
      async (_, details: TxDetails, net: NetworkString) => {
        if (net !== network) return;
        const txDetailsExtended = await computeTxDetailsExtended(
          appRepository,
          walletRepository,
          blockHeadersRepository
        )(details);
        transactions.setValue((txs) => [...txs, txDetailsExtended].sort(sortTxDetails()));
      }
    );

    setCloseTxListener(closeOnNewTransactionListener);
  };

  useEffect(() => {
    if (authenticated.value) {
      appRepository
        .getNetwork()
        .then((network) => {
          if (network) setNetwork(network);
        })
        .catch(console.error);

      const closeAssetListener = assetRepository.onNewAsset((asset) =>
        Promise.resolve(assets.setValue((assets) => sortAssets([...assets, asset])))
      );

      const closeNetworkListener = appRepository.onNetworkChanged((net) => {
        setNetwork(net);
        closeUtxosListeners?.();
        closeTxListener?.();
        return Promise.resolve();
      });

      return () => {
        // close all while unmounting
        closeUtxosListeners?.();
        closeTxListener?.();
        closeNetworkListener();
        closeAssetListener();
      };
    } else {
      balances.setValue({});
      utxos.setValue([]);
      assets.setValue([]);
      setNetwork('liquid');
    }
  }, [authenticated.value]);

  useEffect(() => {
    authenticated.setLoading(true);
    appRepository
      .getStatus()
      .then((status) => {
        if (status) {
          authenticated.setValue(true);
        }
        authenticated.setLoading(false);
      })
      .catch(console.error);

    const closeAuthListener = appRepository.onIsAuthenticatedChanged((auth) => {
      authenticated.setValue(auth);
      return Promise.resolve();
    });

    return closeAuthListener;
  }, []);

  return (
    <StorageContext.Provider
      value={{
        walletRepository,
        appRepository,
        assetRepository,
        taxiRepository,
        onboardingRepository,
        sendFlowRepository,
        blockHeadersRepository,
        cache: {
          balances,
          network,
          utxos,
          assets,
          authenticated,
          transactions,
        },
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

// sort function for txDetails, use the height member to sort
// put unconfirmed txs first and then sort by height (desc)
function sortTxDetails(): ((a: TxDetails, b: TxDetails) => number) | undefined {
  return (a, b) => {
    if (a.height === b.height) return 0;
    if (!a.height || a.height === -1) return -1;
    if (!b.height || b.height === -1) return 1;
    return b.height - a.height;
  };
}

export const useStorageContext = () => useContext(StorageContext);
