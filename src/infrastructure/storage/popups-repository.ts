import Browser from 'webextension-polyfill';
import type { PopupsRepository } from '../repository';

export enum PopupsStorageKeys {
  HOSTNAME = 'enableHostname',
  SIGN_TRANSACTION_PSET = 'signTransactionPset',
  SIGN_MESSAGE = 'signMessage',
}

export class PopupsStorageAPI implements PopupsRepository {
  clear(): Promise<void> {
    return Browser.storage.local.remove([
      PopupsStorageKeys.HOSTNAME,
      PopupsStorageKeys.SIGN_TRANSACTION_PSET,
      PopupsStorageKeys.SIGN_MESSAGE,
    ]);
  }
  async setHostnameToEnable(hostname: string): Promise<void> {
    await Browser.storage.local.set({
      [PopupsStorageKeys.HOSTNAME]: hostname,
    });
  }

  async setPsetToSign(pset: string, hostname: string): Promise<void> {
    await Browser.storage.local.set({
      [PopupsStorageKeys.SIGN_TRANSACTION_PSET]: pset,
      [PopupsStorageKeys.HOSTNAME]: hostname,
    });
  }

  async setMessageToSign(message: string, hostname: string): Promise<void> {
    await Browser.storage.local.set({
      [PopupsStorageKeys.SIGN_MESSAGE]: message,
      [PopupsStorageKeys.HOSTNAME]: hostname,
    });
  }
}
