import { Transaction } from "liquidjs-lib";
import { NetworkString } from "marina-provider";
import { useEffect, useState } from "react";
import Browser from "webextension-polyfill";
import { Account } from "../../domain/account";
import { AccountDetails } from "../../domain/account-type";
import { Asset } from "../../domain/asset";
import { UnblindedOutput, TxDetails } from "../../domain/transaction";
import { sortAssets } from "../../extension/utility/sort";
import { AppStorageAPI, AppStorageKeys, WebExplorerURLKey, WebsocketURLKey } from "./app-repository";
import { AssetKey, AssetStorageAPI } from "./asset-repository";
import { OnboardingStorageAPI, OnboardingStorageKeys } from "./onboarding-repository";
import { PopupsStorageKeys } from "./popups-repository";
import { SendFlowStorageAPI } from "./send-flow-repository";
import { TaxiAssetsKey, TaxiStorageAPI, TaxiURLKey } from "./taxi-repository";
import { AccountKey, OutpointBlindingDataKey, ScriptUnspentsKey, TxDetailsKey, WalletStorageAPI, WalletStorageKey } from "./wallet-repository";

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
        const storage = Browser.storage[namespace];
        const [value, setValue] = useState<T>();

        useEffect(() => {
            storage.get(key).then(({ [key]: value }) => setValue(value as T)).catch(console.error);

            const listener = (changes: Record<string, Browser.Storage.StorageChange>, areaName: string) => {
                if (areaName === namespace && changes[key]) {
                    setValue(changes[key].newValue);
                }
            }
            Browser.storage.onChanged.addListener(listener);
            return () => {
                Browser.storage.onChanged.removeListener(listener);
            }
        }, []);

        return value;
    }
}

export const useSelectAccount = (name: string): ReadonlyReactHook<Account | undefined> => {
    const useAccountDetailsHook = makeReactHook<AccountDetails>('local', AccountKey.make(name));
    return () => {
        const [account, setAccount] = useState<Account>();
        const details = useAccountDetailsHook();

        useEffect(() => {
            (async () => {
                const network = await appRepository.getNetwork();
                if (!network) throw new Error(`No network selected`);
                if (details && details.accountNetworks.includes(network)) {
                    const chainSource = await appRepository.getChainSource(network);
                    if (!chainSource) throw new Error(`No chain source for network ${network}`);
                    const masterBlindingKey = await walletRepository.getMasterBlindingKey();
                    if (!masterBlindingKey) throw new Error(`No master blinding key`);

                    const account = new Account({
                        name,
                        chainSource,
                        masterBlindingKey,
                        masterPublicKey: details.masterPublicKey,
                        network,
                        walletRepository,
                    });
                    setAccount(account);
                }
            })().catch((r) => {
                console.error(r);
                setAccount(undefined);
            })
        }, [details])

        return account;
    }
}

export const useSelectAccounts = (...names: string[]): ReadonlyReactHook<Record<string, Account | undefined>> => {
    return () => {
        const accounts: Record<string, Account | undefined> = {};
        for (const name of names) {
            accounts[name] = useSelectAccount(name)();
        }
        return accounts;
    }
}

export const useSelectNetwork = makeReactHook<NetworkString>('local', AppStorageKeys.NETWORK);
export const useSelectIsAuthenticated = makeReactHook<boolean>('local', AppStorageKeys.AUTHENTICATED);
export const useSelectIsOnboardingCompleted = makeReactHook<boolean>('local', AppStorageKeys.ONBOARDING_COMPLETED);
export const useSelectEncryptedMnemonic = makeReactHook<string>('local', WalletStorageKey.ENCRYPTED_MNEMONIC);
export const useSelectPasswordHash = makeReactHook<string>('local', WalletStorageKey.PASSWORD_HASH);
export const useSelectIsFromPopupFlow = makeReactHook<boolean>('local', OnboardingStorageKeys.IS_FROM_POPUP_FLOW);
export const useSelectOnboardingMnemonic = makeReactHook<string>('local', OnboardingStorageKeys.ONBOARDING_MNEMONIC);
export const useSelectOnboardingPassword = makeReactHook<string>('local', OnboardingStorageKeys.ONBOARDING_PASSWORD);
export const useSelectWebsocketURL = (net: NetworkString) => makeReactHook<string>('local', WebsocketURLKey.make(net));
export const useSelectWebExplorerURL = (net: NetworkString) => makeReactHook<string>('local', WebExplorerURLKey.make(net));
export const useSelectTaxiURL = (net: NetworkString) => makeReactHook<string>('local', TaxiURLKey.make(net));
export const useSelectPopupHostname = makeReactHook<string>('local', PopupsStorageKeys.HOSTNAME);
export const useSelectPopupMessageToSign = makeReactHook<string>('local', PopupsStorageKeys.SIGN_MESSAGE);
export const useSelectPopupPsetToSign = makeReactHook<string>('local', PopupsStorageKeys.SIGN_TRANSACTION_PSET);

export const useSelectUtxos = (...accounts: string[]) => {
    const updateUtxosArray = async (setUtxos: (utxos: UnblindedOutput[]) => void) => {
        const network = await appRepository.getNetwork();
        if (!network) return;
        else setUtxos(await walletRepository.getUtxos(network, ...accounts));
    }

    return () => {
        const [utxos, setUtxos] = useState<UnblindedOutput[]>([]);

        useEffect(() => {
            updateUtxosArray(setUtxos).catch(console.error);

            const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
                if (areaName !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    if (change.newValue && (ScriptUnspentsKey.is(key) || OutpointBlindingDataKey.is(key))) {
                        updateUtxosArray(setUtxos).catch(console.error);
                        return;
                    }
                }
            }
            // listen to new "unblinding event" and update the utxos
            Browser.storage.onChanged.addListener(listener);
            return () => {
                Browser.storage.onChanged.removeListener(listener);
            }
        }, []);


        return utxos;
    }
}

export const useSelectAllAssets = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [sortedAssets, setSortedAssets] = useState<Asset[]>([]);

    useEffect(() => {
        (async () => {
            const network = await appRepository.getNetwork();
            if (!network) throw new Error(`No network selected`);
            const assets = await assetRepository.getAllAssets(network)
            setAssets(assets)
            const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
                if (areaName !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    if (AssetKey.is(key) && change.newValue) {
                        setAssets([...assets, change.newValue as Asset])
                        return;
                    }
                }
            }

            Browser.storage.onChanged.addListener(listener);
            return () => {
                Browser.storage.onChanged.removeListener(listener);
            }
        })().catch(console.error);
    }, []);

    useEffect(() => {
        if (assets) setSortedAssets(sortAssets(assets))
    }, [assets])

    return sortedAssets;
}

export const useSelectTaxiAssets = () => {
    const [assets, setAssets] = useState<(string | Asset)[]>([]);

    useEffect(() => {
        taxiRepository.getTaxiAssets().then(setAssets).catch(console.error);
        const listener = async (changes: Browser.Storage.StorageChange, areaName: string) => {
            if (areaName !== 'local') return;
            for (const [key, change] of Object.entries(changes)) {
                if (TaxiAssetsKey.is(key) && change.newValue) {
                    taxiRepository.getTaxiAssets().then(setAssets).catch(console.error);
                }
            }
        }
        Browser.storage.onChanged.addListener(listener);
        return () => {
            Browser.storage.onChanged.removeListener(listener);
        }
    }, []);

    return assets;
}

export const useSelectTransactions = () => {
    const [transactions, setTransactions] = useState<TxDetails[]>([]);
    useEffect(() => {
        (async () => {
            const net = await appRepository.getNetwork();
            if (!net) return;
            const txIds = await walletRepository.getTransactions(net);
            const details = await walletRepository.getTxDetails(...txIds);
            const txDetails = Object.values(details).sort((a, b) => {
                if (a.height === b.height) return 0;
                if (a.height === undefined || a.height === -1) return 1;
                if (b.height === undefined || b.height === -1) return -1;
                return a.height - b.height;
            })

            setTransactions(txDetails);

            const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
                if (areaName !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    if (TxDetailsKey.is(key) && change.newValue) {
                        const details = change.newValue as TxDetails;
                        const [txID] = TxDetailsKey.decode(key);
                        const newTransactions = [...transactions];
                        const index = newTransactions.findIndex((tx) => tx.hex && Transaction.fromHex(tx.hex).getId() === txID);
                        if (index === -1) {
                            setTransactions([details, ...newTransactions]);
                        } else {
                            newTransactions[index] = details;
                            setTransactions(newTransactions);
                        }
                    }
                }
            }
            Browser.storage.onChanged.addListener(listener);
            return () => {
                Browser.storage.onChanged.removeListener(listener);
            }
        })()
    }, []);
    return transactions;
}