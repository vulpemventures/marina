import { BrowserStorageAppRepo } from './app/browser/browser-storage-app-repository';
import { IAppRepository } from '../domain/app/i-app-repository';
import { BrowserStorageAssetsRepo } from './assets/browser-storage-assets-repository';
import { IAssetsRepository } from '../domain/asset/i-assets-repository';
import { BrowserStorageTxsHistoryRepo } from './txs-history/browser-storage-txs-history-repository';
import { ITxsHistoryRepository } from '../domain/transaction/i-txs-history-repository';
import { BrowserStorageWalletRepo } from './wallet/browser/browser-storage-wallet-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';
import { IConnectRepository } from '../domain/connect/i-connect-repository';
import { BrowserStorageConnectRepo } from './connect/browser-storage-connect-repository';

export const repos = {
  app: new BrowserStorageAppRepo() as IAppRepository,
  assets: new BrowserStorageAssetsRepo() as IAssetsRepository,
  connect: new BrowserStorageConnectRepo() as IConnectRepository,
  txsHistory: new BrowserStorageTxsHistoryRepo() as ITxsHistoryRepository,
  wallet: new BrowserStorageWalletRepo() as IWalletRepository,
};
