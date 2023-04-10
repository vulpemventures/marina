import Browser from 'webextension-polyfill';
import type { BackupData, BackupService } from '../domain/backup';

const BrowserSyncID = 'browser-sync';

export class BrowserSyncBackup implements BackupService {
  async save(data: Partial<BackupData>): Promise<void> {
    const { [BrowserSyncID]: backupData } = await Browser.storage.sync.get(BrowserSyncID);
    const newBackupData = {
      ...backupData,
      ...data,
    };
    return Browser.storage.sync.set({ [BrowserSyncID]: newBackupData });
  }

  async load(): Promise<BackupData> {
    const { [BrowserSyncID]: backupData } = await Browser.storage.sync.get(BrowserSyncID);
    return backupData ? backupData : { ionioAccountsRestorationDictionary: {} };
  }

  delete(): Promise<void> {
    return Browser.storage.sync.remove(BrowserSyncID);
  }

  async initialize(): Promise<void> {
    const bytesInUse = await Browser.storage.sync.getBytesInUse();
    if (bytesInUse >= Browser.storage.sync.QUOTA_BYTES) {
      throw new Error('Browser storage is full');
    }
  }
}
