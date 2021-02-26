import { BrowserStorageAppRepo } from './app/browser/browser-storage-app-repository';
import { IAppRepository } from '../domain/app/i-app-repository';
import { BrowserStorageAssetsRepo } from './assets/browser-storage-assets-repository';
import { IAssetsRepository } from '../domain/asset/i-assets-repository';
import { BrowserStorageTxsHistoryRepo } from './txs-history/browser-storage-txs-history-repository';
import { ITxsHistoryRepository } from '../domain/transaction/i-txs-history-repository';
import { BrowserStorageWalletRepo } from './wallet/browser/browser-storage-wallet-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';

export const repos = {
  app: new BrowserStorageAppRepo() as IAppRepository,
  assets: new BrowserStorageAssetsRepo() as IAssetsRepository,
  txsHistory: new BrowserStorageTxsHistoryRepo() as ITxsHistoryRepository,
  wallet: new BrowserStorageWalletRepo() as IWalletRepository,
};
