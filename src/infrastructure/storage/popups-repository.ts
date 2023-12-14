import Browser from 'webextension-polyfill';
import type {
  CreateAccountParameters,
  PopupsRepository,
  SpendParameters,
} from '../../domain/repository';

export enum PopupsStorageKeys {
  HOSTNAME = 'enableHostname', // store the storage to enable in the popup connect/enable
  SIGN_TRANSACTION_PSET = 'signTransactionPset', // store the pset to sign in the connect/sign-pset popup
  SIGN_MESSAGE = 'signMessage', // store the message to sign in the connect/sign-message popup
  SPEND_PARAMETERS = 'spendParameters', // store the spend parameters in the connect/spend popup
  CREATE_ACCOUNT_PARAMETERS = 'createAccountParameters', // store the create account parameters in the connect/create-account popup
}

export class PopupsStorageAPI implements PopupsRepository {
  clear(): Promise<void> {
    return Browser.storage.local.remove([
      PopupsStorageKeys.HOSTNAME,
      PopupsStorageKeys.SIGN_TRANSACTION_PSET,
      PopupsStorageKeys.SIGN_MESSAGE,
      PopupsStorageKeys.SPEND_PARAMETERS,
      PopupsStorageKeys.CREATE_ACCOUNT_PARAMETERS,
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

  async setCreateAccountParameters(parameters: CreateAccountParameters): Promise<void> {
    await Browser.storage.local.set({
      [PopupsStorageKeys.CREATE_ACCOUNT_PARAMETERS]: parameters,
    });
  }
}
