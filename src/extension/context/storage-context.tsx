import { createContext, useContext, useEffect, useState } from 'react';
import type {
  AppRepository,
  AssetRepository,
  BlockheadersRepository,
  OnboardingRepository,
  SendFlowRepository,
  RefundSwapFlowRepository,
  RefundableSwapsRepository,
  TaxiRepository,
  WalletRepository,
} from '../../domain/repository';
import { AppStorageAPI } from '../../infrastructure/storage/app-repository';
import { AssetStorageAPI } from '../../infrastructure/storage/asset-repository';
import { BlockHeadersAPI } from '../../infrastructure/storage/blockheaders-repository';
import { OnboardingStorageAPI } from '../../infrastructure/storage/onboarding-repository';
import { SendFlowStorageAPI } from '../../infrastructure/storage/send-flow-repository';
import { TaxiStorageAPI } from '../../infrastructure/storage/taxi-repository';
import { WalletStorageAPI } from '../../infrastructure/storage/wallet-repository';
import type { PresentationCache } from '../../domain/presenter';
import { PresenterImpl } from '../../application/presenter';
import { useToastContext } from './toast-context';
import { RefundableSwapsStorageAPI } from '../../infrastructure/storage/refundable-swaps-repository';
import { RefundSwapFlowStorageAPI } from '../../infrastructure/storage/refund-swap-flow-repository';

const walletRepository = new WalletStorageAPI();
const appRepository = new AppStorageAPI();
const assetRepository = new AssetStorageAPI(walletRepository);
const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
const onboardingRepository = new OnboardingStorageAPI();
const sendFlowRepository = new SendFlowStorageAPI();
const blockHeadersRepository = new BlockHeadersAPI();
const refundableSwapsRepository = new RefundableSwapsStorageAPI();
const refundSwapFlowRepository = new RefundSwapFlowStorageAPI();

interface StorageContextProps {
  walletRepository: WalletRepository;
  appRepository: AppRepository;
  assetRepository: AssetRepository;
  taxiRepository: TaxiRepository;
  onboardingRepository: OnboardingRepository;
  sendFlowRepository: SendFlowRepository;
  blockHeadersRepository: BlockheadersRepository;
  cache?: PresentationCache;
  refundableSwapsRepository: RefundableSwapsRepository;
  refundSwapFlowRepository: RefundSwapFlowRepository;
}

const StorageContext = createContext<StorageContextProps>({
  walletRepository,
  appRepository,
  assetRepository,
  taxiRepository,
  onboardingRepository,
  sendFlowRepository,
  blockHeadersRepository,
  refundableSwapsRepository,
  refundSwapFlowRepository,
});

const presenter = new PresenterImpl(
  appRepository,
  walletRepository,
  assetRepository,
  blockHeadersRepository
);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const [cache, setCache] = useState<PresentationCache>();
  const { showToast } = useToastContext();

  useEffect(() => {
    presenter
      .present((newCache) => {
        setCache(newCache);
      })
      .catch((e) => {
        console.error(e);
        showToast('Error while loading cache context');
      });
    return () => {
      presenter.stop();
    };
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
        cache,
        refundableSwapsRepository,
        refundSwapFlowRepository,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorageContext = () => useContext(StorageContext);
