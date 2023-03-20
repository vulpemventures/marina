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
import type { UnblindedOutput } from '../../domain/transaction';
import { computeBalances } from '../../domain/transaction';
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

  const [closeUtxosListeners, setCloseUtxosListenersFunction] = useState<() => void>();

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
        await setInitialState();
      });

      return () => {
        // close all while unmounting
        closeUtxosListeners?.();
        closeNetworkListener();
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
        },
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorageContext = () => useContext(StorageContext);
