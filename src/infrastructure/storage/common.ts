import type { Asset } from 'marina-provider';
import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import type { TxDetails } from '../../domain/transaction';
import type { Encrypted } from '../../domain/encryption';
import type {
  AppRepository,
  CreateAccountParameters,
  SpendParameters,
  TaxiRepository,
  WalletRepository,
} from '../../domain/repository';
import { OnboardingStorageKeys } from './onboarding-repository';
import { PopupsStorageKeys } from './popups-repository';
import { TaxiAssetsKey } from './taxi-repository';
import { TxDetailsKey, WalletStorageKey } from './wallet-repository';

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

export const useSelectTransactions =
  (appRepository: AppRepository, walletRepository: WalletRepository) => () => {
    const [transactions, setTransactions] = useState<TxDetails[]>([]);

    const updateTransactions = async () => {
      const net = await appRepository.getNetwork();
      if (!net) return;
      const txIds = await walletRepository.getTransactions(net);
      const details = await walletRepository.getTxDetails(...txIds);
      const txDetails = Object.values(details).sort(sortTxDetails());

      setTransactions(txDetails);

      // check if we have the hex, if not fetch it
      const chainSource = await appRepository.getChainSource();
      if (chainSource) {
        const txIDs = Object.entries(details)
          .filter(([, details]) => !details.hex)
          .map(([txID]) => txID);

        console.debug(`Fetching ${txIDs.length} transactions from the chain source`);
        const txs = await chainSource.fetchTransactions(txIDs);
        await walletRepository.updateTxDetails(Object.fromEntries(txs.map((tx) => [tx.txID, tx])));
      }
    };

    useEffect(() => {
      const listener = async (changes: Browser.Storage.StorageChange, areaName: string) => {
        if (areaName !== 'local') return;
        for (const [key, change] of Object.entries(changes)) {
          if (TxDetailsKey.is(key) && change.newValue) {
            await updateTransactions();
          }
        }
      };

      updateTransactions().catch(console.error);

      Browser.storage.onChanged.addListener(listener);
      return () => {
        Browser.storage.onChanged.removeListener(listener);
      };
    }, []);

    return transactions;
  };

// sort function for txDetails, use the height member to sort
// put unconfirmed txs first and then sort by height (desc)
function sortTxDetails(): ((a: TxDetails, b: TxDetails) => number) | undefined {
  return (a, b) => {
    if (a.height === b.height) return 0;
    if (!a.height || a.height === -1) return -1;
    if (!b.height || b.height === -1) return 1;
    return b.height - a.height;
  };
}
