import Browser from 'webextension-polyfill';
import type { PopupsRepository, SpendParameters } from '../repository';

export enum PopupsStorageKeys {
  HOSTNAME = 'enableHostname', // store the storage to enable in the popup connect/enable
  SIGN_TRANSACTION_PSET = 'signTransactionPset', // store the pset to sign in the connect/sign-pset popup
  SIGN_MESSAGE = 'signMessage', // store the message to sign in the connect/sign-message popup
  SPEND_PARAMETERS = 'spendParameters', // store the spend parameters in the connect/spend popup
}

export class PopupsStorageAPI implements PopupsRepository {
  clear(): Promise<void> {
    return Browser.storage.local.remove([
      PopupsStorageKeys.HOSTNAME,
      PopupsStorageKeys.SIGN_TRANSACTION_PSET,
      PopupsStorageKeys.SIGN_MESSAGE,
      PopupsStorageKeys.SPEND_PARAMETERS,
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

  async setSpendParameters(parameters: SpendParameters): Promise<void> {
    await Browser.storage.local.set({
      [PopupsStorageKeys.SPEND_PARAMETERS]: parameters,
    });
  }
}
