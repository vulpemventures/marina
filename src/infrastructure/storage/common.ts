import type { Asset, NetworkString } from 'marina-provider';
import { useEffect, useState } from 'react';
import Browser from 'webextension-polyfill';
import type { UnblindedOutput, TxDetails } from '../../domain/transaction';
import type { Encrypted } from '../../domain/encryption';
import { sortAssets } from '../../extension/utility/sort';
import type { CreateAccountParameters, SpendParameters } from '../../domain/repository';
import { AppStorageAPI, AppStorageKeys } from './app-repository';
import { AssetKey, AssetStorageAPI } from './asset-repository';
import { OnboardingStorageAPI, OnboardingStorageKeys } from './onboarding-repository';
import { PopupsStorageKeys } from './popups-repository';
import { SendFlowStorageAPI } from './send-flow-repository';
import { TaxiAssetsKey, TaxiStorageAPI } from './taxi-repository';
import {
  OutpointBlindingDataKey,
  TxDetailsKey,
  WalletStorageAPI,
  WalletStorageKey,
} from './wallet-repository';

export type MaybeNull<T> = Promise<T | null>;

export const walletRepository = new WalletStorageAPI();
export const appRepository = new AppStorageAPI();
export const assetRepository = new AssetStorageAPI(walletRepository);
export const taxiRepository = new TaxiStorageAPI(assetRepository, appRepository);
export const onboardingRepository = new OnboardingStorageAPI();
export const sendFlowRepository = new SendFlowStorageAPI();

export type ReadonlyReactHook<T> = () => T | undefined;

export function makeReactHook<T>(namespace: 'sync' | 'local', key: string): ReadonlyReactHook<T> {
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

export const useSelectNetwork = makeReactHook<NetworkString>('local', AppStorageKeys.NETWORK);
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

// returns the utxos for the given accounts, and a boolean indicating if the utxos has been loaded
export const useSelectUtxos = (...accounts: string[]) => {
  return (): [UnblindedOutput[], boolean] => {
    const [utxos, setUtxos] = useState<UnblindedOutput[]>([]);
    const [loading, setLoading] = useState(true);

    const updateUtxosArray = async () => {
      const network = await appRepository.getNetwork();
      if (network) {
        const newUtxos = await walletRepository.getUtxos(network, ...accounts);
        setLoading(false);
        setUtxos(newUtxos);
      }
    };

    useEffect(() => {
      updateUtxosArray().catch(console.error);

      const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
        if (areaName !== 'local') return;
        for (const [key, change] of Object.entries(changes)) {
          if (
            (change.newValue && (TxDetailsKey.is(key) || OutpointBlindingDataKey.is(key))) ||
            key === AppStorageKeys.NETWORK
          ) {
            updateUtxosArray().catch(console.error);
            return;
          }
        }
      };
      // listen to new "unblinding event" and update the utxos
      Browser.storage.onChanged.addListener(listener);
      return () => {
        Browser.storage.onChanged.removeListener(listener);
      };
    }, []);

    return [utxos, loading];
  };
};

export const useSelectAllAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sortedAssets, setSortedAssets] = useState<Asset[]>([]);

  useEffect(() => {
    (async () => {
      const network = await appRepository.getNetwork();
      if (!network) throw new Error(`No network selected`);
      const assets = await assetRepository.getAllAssets(network);
      setAssets(assets);
      const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
        if (areaName !== 'local') return;
        for (const [key, change] of Object.entries(changes)) {
          if (AssetKey.is(key) && change.newValue) {
            setAssets([...assets, change.newValue as Asset]);
            return;
          }
        }
      };

      Browser.storage.onChanged.addListener(listener);
      return () => {
        Browser.storage.onChanged.removeListener(listener);
      };
    })().catch(console.error);
  }, []);

  useEffect(() => {
    if (assets) setSortedAssets(sortAssets(assets));
  }, [assets]);

  return sortedAssets;
};

export const useSelectTaxiAssets = () => {
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

export const useSelectTransactions = () => {
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
