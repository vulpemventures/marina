import type { Asset, NetworkString } from 'marina-provider';
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

const walletRepository = new WalletStorageAPI();
const appRepository = new AppStorageAPI();
const assetRepository = new AssetStorageAPI(walletRepository);
const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
const onboardingRepository = new OnboardingStorageAPI();
const sendFlowRepository = new SendFlowStorageAPI();
const blockHeadersRepository = new BlockHeadersAPI();

interface StorageContextCache {
  network: NetworkString;
  balances: Record<string, number>;
  utxos: UnblindedOutput[];
  assets: Asset[];
  authenticated: boolean;
  loading: boolean;
  transactions: TxDetailsExtended[];
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
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [network, setNetwork] = useState<NetworkString>('liquid');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [utxos, setUtxos] = useState<UnblindedOutput[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sortedAssets, setSortedAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<TxDetailsExtended[]>([]);

  const [closeUtxosListeners, setCloseUtxosListenersFunction] = useState<() => void>();
  const [closeTxListener, setCloseTxListener] = useState<() => void>();

  // reset to initial state while mounting the context or when the network changes
  const setInitialState = async () => {
    const network = await appRepository.getNetwork();
    if (network) {
      setNetwork(network);
      const fromRepo = await walletRepository.getUtxos(network);
      setUtxos(fromRepo);
      setBalances(computeBalances(fromRepo));
      setAssets(await assetRepository.getAllAssets(network));
      setUtxosListeners(network);

      // transactions
      const txIds = await walletRepository.getTransactions(network);
      const details = await walletRepository.getTxDetails(...txIds);
      const txDetails = Object.values(details).sort(sortTxDetails());
      const txDetailsExtended = await Promise.all(
        txDetails.map(
          computeTxDetailsExtended(appRepository, walletRepository, blockHeadersRepository)
        )
      );
      setTransactions(txDetailsExtended);
      setTransactionsListener(network);
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
    }
  };

  // use the repositories listeners to update the state and the balances while the utxos change
  const setUtxosListeners = (network: NetworkString) => {
    const closeOnNewUtxoListener = walletRepository.onNewUtxo(network)(async (_) => {
      const fromRepo = await walletRepository.getUtxos(network);
      setUtxos(fromRepo);
      setBalances(computeBalances(fromRepo));
    });

    const closeOnDeleteUtxoListener = walletRepository.onDeleteUtxo(network)(async (_) => {
      const fromRepo = await walletRepository.getUtxos(network);
      setUtxos(fromRepo);
      setBalances(computeBalances(fromRepo));
    });

    // set up the close function for the utxos listeners
    // we need this cause we reload the listener when the network changes
    setCloseUtxosListenersFunction(() => () => {
      closeOnNewUtxoListener?.();
      closeOnDeleteUtxoListener?.();
    });
  };

  const setTransactionsListener = (network: NetworkString) => {
    const closeOnNewTransactionListener = walletRepository.onNewTransaction(
      async (_, details: TxDetails, net: NetworkString) => {
        if (net !== network) return;
        const txDetailsExtended = await computeTxDetailsExtended(
          appRepository,
          walletRepository,
          blockHeadersRepository
        )(details);
        setTransactions((txs) => [...txs, txDetailsExtended].sort(sortTxDetails()));
      }
    );

    setCloseTxListener(closeOnNewTransactionListener);
  };

  useEffect(() => {
    setSortedAssets(sortAssets(assets));
  }, [assets]);

  useEffect(() => {
    if (isAuthenticated) {
      setInitialState().catch(console.error);
      const closeAssetListener = assetRepository.onNewAsset((asset) =>
        Promise.resolve(setAssets((assets) => [...assets, asset]))
      );

      const closeNetworkListener = appRepository.onNetworkChanged(async (net) => {
        setNetwork(net);
        closeUtxosListeners?.();
        closeTxListener?.();
        await setInitialState();
      });

      return () => {
        // close all while unmounting
        closeUtxosListeners?.();
        closeTxListener?.();
        closeNetworkListener();
        closeAssetListener();
      };
    } else {
      setBalances({});
      setUtxos([]);
      setAssets([]);
      setSortedAssets([]);
      setNetwork('liquid');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    appRepository
      .getStatus()
      .then((status) => {
        if (status) {
          setIsAuthenticated(true);
        }
        setLoading(false);
      })
      .catch(console.error);

    const closeAuthListener = appRepository.onIsAuthenticatedChanged((auth) => {
      setIsAuthenticated(auth);
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
          assets: sortedAssets,
          authenticated: isAuthenticated,
          loading,
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
