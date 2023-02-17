import Browser from 'webextension-polyfill';
import type { RestorationJSONDictionary } from '../../domain/account';
import type { OnboardingRepository } from '../repository';

export enum OnboardingStorageKeys {
  ONBOARDING_MNEMONIC = 'onboardingMnemonic',
  ONBOARDING_PASSWORD = 'onboardingPassword',
  IS_FROM_POPUP_FLOW = 'isFromPopupFlow',
  RESTORATION_FILE = 'restorationFile',
}

export class OnboardingStorageAPI implements OnboardingRepository {
  async getOnboardingMnemonic(): Promise<string> {
    const { [OnboardingStorageKeys.ONBOARDING_MNEMONIC]: mnemonic } =
      await Browser.storage.local.get(OnboardingStorageKeys.ONBOARDING_MNEMONIC);
    if (!mnemonic) {
      throw new Error('Onboarding mnemonic not found');
    }
    return mnemonic;
  }

  async getOnboardingPassword(): Promise<string> {
    const { [OnboardingStorageKeys.ONBOARDING_PASSWORD]: password } =
      await Browser.storage.local.get(OnboardingStorageKeys.ONBOARDING_PASSWORD);
    if (!password) {
      throw new Error('Onboarding password not found');
    }
    return password;
  }

  async setOnboardingPasswordAndMnemonic(password: string, mnemonic: string): Promise<void> {
    await Browser.storage.local.set({
      [OnboardingStorageKeys.ONBOARDING_PASSWORD]: password,
      [OnboardingStorageKeys.ONBOARDING_MNEMONIC]: mnemonic,
    });
  }

  async setIsFromPopupFlow(mnemonicToBackup: string): Promise<void> {
    await Browser.storage.local.set({
      [OnboardingStorageKeys.IS_FROM_POPUP_FLOW]: true,
      [OnboardingStorageKeys.ONBOARDING_MNEMONIC]: mnemonicToBackup,
    });
  }

  async getRestorationJSONDictionary(): Promise<RestorationJSONDictionary | undefined> {
    const { [OnboardingStorageKeys.RESTORATION_FILE]: restorationFile } =
      await Browser.storage.local.get(OnboardingStorageKeys.RESTORATION_FILE);
    if (!restorationFile) return undefined;
    return restorationFile;
  }

  async setRestorationJSONDictionary(json: RestorationJSONDictionary): Promise<void> {
    await Browser.storage.local.set({
      [OnboardingStorageKeys.RESTORATION_FILE]: json,
    });
  }

  flush(): Promise<void> {
    return Browser.storage.local.remove([
      OnboardingStorageKeys.ONBOARDING_MNEMONIC,
      OnboardingStorageKeys.ONBOARDING_PASSWORD,
      OnboardingStorageKeys.IS_FROM_POPUP_FLOW,
    ]);
  }
}
