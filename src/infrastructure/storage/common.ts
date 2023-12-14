import type { Asset } from 'marina-provider';
import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import type { Encrypted } from '../../domain/encryption';
import type {
  CreateAccountParameters,
  SpendParameters,
  TaxiRepository,
} from '../../domain/repository';
import { OnboardingStorageKeys } from './onboarding-repository';
import { PopupsStorageKeys } from './popups-repository';
import { TaxiAssetsKey } from './taxi-repository';
import { WalletStorageKey } from './wallet-repository';

export type MaybeNull<T> = Promise<T | null>;

export type ReadonlyReactHook<T> = () => T | undefined;

function makeReactHook<T>(namespace: 'sync' | 'local', key: string): ReadonlyReactHook<T> {
  return function useStorageSelector(): T | undefined {
    const [value, setValue] = useState<T>();

    useEffect(() => {
      Browser.storage[namespace]
        .get(key)
        .then(({ [key]: value }) => setValue(value as T))
        .catch(console.error);
    }, [key, namespace]);

    useEffect(() => {
      const listener = (
        changes: Record<string, Browser.Storage.StorageChange>,
        areaName: string
      ) => {
        if (areaName === namespace && changes[key]) {
          setValue(changes[key].newValue);
        }
      };
      Browser.storage.onChanged.addListener(listener);
      return () => {
        Browser.storage.onChanged.removeListener(listener);
      };
    }, [key, namespace]);

    return value;
  };
}

export const useSelectEncryptedMnemonic = makeReactHook<Encrypted>(
  'local',
  WalletStorageKey.ENCRYPTED_MNEMONIC
);
export const useSelectIsFromPopupFlow = makeReactHook<boolean>(
  'local',
  OnboardingStorageKeys.IS_FROM_POPUP_FLOW
);
export const useSelectOnboardingMnemonic = makeReactHook<string>(
  'local',
  OnboardingStorageKeys.ONBOARDING_MNEMONIC
);
export const useSelectPopupHostname = makeReactHook<string>('local', PopupsStorageKeys.HOSTNAME);
export const useSelectPopupMessageToSign = makeReactHook<string>(
  'local',
  PopupsStorageKeys.SIGN_MESSAGE
);
export const useSelectPopupPsetToSign = makeReactHook<string>(
  'local',
  PopupsStorageKeys.SIGN_TRANSACTION_PSET
);
export const useSelectPopupSpendParameters = makeReactHook<SpendParameters>(
  'local',
  PopupsStorageKeys.SPEND_PARAMETERS
);
export const useSelectPopupCreateAccountParameters = makeReactHook<CreateAccountParameters>(
  'local',
  PopupsStorageKeys.CREATE_ACCOUNT_PARAMETERS
);

export const useSelectTaxiAssets = (taxiRepository: TaxiRepository) => () => {
  const [assets, setAssets] = useState<(string | Asset)[]>([]);

  useEffect(() => {
    taxiRepository.getTaxiAssets().then(setAssets).catch(console.error);
    const listener = async (changes: Browser.Storage.StorageChange, areaName: string) => {
      if (areaName !== 'local') return;
      for (const [key, change] of Object.entries(changes)) {
        if (TaxiAssetsKey.is(key) && change.newValue) {
          const assets = await taxiRepository.getTaxiAssets();
          setAssets(assets);
        }
      }
    };
    Browser.storage.onChanged.addListener(listener);
    return () => {
      Browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  return assets;
};
