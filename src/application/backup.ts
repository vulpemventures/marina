import type { NetworkString } from 'marina-provider';
import type { BackupConfig, BackupService} from '../domain/backup';
import { BackupServiceType } from '../domain/backup';
import type { AppRepository, WalletRepository } from '../domain/repository';
import { BrowserSyncBackup } from '../port/browser-sync-backup';
import { AccountFactory } from './account';

export function makeBackupService(config: BackupConfig): BackupService {
  switch (config.type) {
    case BackupServiceType.BROWSER_SYNC:
      return new BrowserSyncBackup();
    default:
      throw new Error('Invalid backup service configuration');
  }
}

function isNetworkString(str: string): str is NetworkString {
  return str === 'liquid' || str === 'testnet' || str === 'regtest';
}

export async function loadFromBackupServices(
  appRepository: AppRepository,
  walletRepository: WalletRepository,
  backupServices: BackupService[]
) {
  const backupData = await Promise.all(backupServices.map((service) => service.load()));

  const chainSourceLiquid = await appRepository.getChainSource('liquid');
  const chainSourceTestnet = await appRepository.getChainSource('testnet');
  const chainSourceRegtest = await appRepository.getChainSource('regtest');
  const chainSource = (network: string) =>
    network === 'liquid'
      ? chainSourceLiquid
      : network === 'testnet'
      ? chainSourceTestnet
      : chainSourceRegtest;

  try {
    const accountFactory = await AccountFactory.create(walletRepository);

    for (const { ionioAccountsRestorationDictionary } of backupData) {
      for (const [network, restorations] of Object.entries(ionioAccountsRestorationDictionary)) {
        if (!isNetworkString(network)) continue;
        const chain = chainSource(network);
        if (!chain) continue;

        for (const restoration of restorations) {
          try {
            const account = await accountFactory.make(network, restoration.accountName);
            await account.restoreFromJSON(chain, restoration);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  } finally {
    await Promise.all([
      chainSourceLiquid?.close(),
      chainSourceTestnet?.close(),
      chainSourceRegtest?.close(),
    ]).catch(console.error);
  }
}
