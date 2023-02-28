import type { NetworkString } from 'marina-provider';
import Browser from 'webextension-polyfill';
import { ElectrumWS } from '../ws/ws-electrs';
import { WsElectrumChainSource } from '../electrum-chain-source';
import {
  BlockstreamExplorerURLs,
  BlockstreamTestnetExplorerURLs,
  NigiriDefaultExplorerURLs,
} from '../../domain/explorer';
import type { AppRepository, AppStatus, Loader } from '../../domain/repository';
import type { MaybeNull } from './common';
import { DynamicStorageKey } from './dynamic-key';
import type { ChainSource } from '../../domain/chainsource';

export enum AppStorageKeys {
  ONBOARDING_COMPLETED = 'onboardingCompleted',
  AUTHENTICATED = 'authenticated',
  NETWORK = 'network',
  ENABLED_SITES = 'enabledSites',
  VERIFIED_MNEMONIC = 'verifiedMnemonic',
}

// Dynamic key
export const WebsocketURLKey = new DynamicStorageKey<[net: NetworkString]>('webSocketURL');
export const WebExplorerURLKey = new DynamicStorageKey<[net: NetworkString]>('webExplorerURL');

function increment(n: number | null | undefined): number {
  if (!n || n <= 0) return 1;
  return n + 1;
}

function decrement(n: number | null | undefined): number {
  if (!n || n <= 0) return 0;
  return n - 1;
}

function LoaderFromStaticKey(key: string): Loader {
  return {
    increment: async () => {
      const { [key]: value } = await Browser.storage.local.get([key]);
      return Browser.storage.local.set({ [key]: increment(value) });
    },
    decrement: async () => {
      const { [key]: value } = await Browser.storage.local.get([key]);
      return Browser.storage.local.set({ [key]: decrement(value) });
    },
    onChanged: (callback) => {
      const listener = (
        changes: Record<string, Browser.Storage.StorageChange>,
        areaName: string
      ) => {
        if (areaName === 'local' && key in changes) {
          callback((changes[key].newValue ?? 0) > 0);
        }
      };
      Browser.storage.onChanged.addListener(listener);
      return () => Browser.storage.onChanged.removeListener(listener);
    },
  };
}

export class AppStorageAPI implements AppRepository {
  restorerLoader = LoaderFromStaticKey('restorerLoader');
  updaterLoader = LoaderFromStaticKey('updaterLoader');

  static DEFAULT_WEB_URLS = new Map<NetworkString, string>([
    ['liquid', BlockstreamExplorerURLs.webExplorerURL],
    ['testnet', BlockstreamTestnetExplorerURLs.webExplorerURL],
    ['regtest', NigiriDefaultExplorerURLs.webExplorerURL],
  ]);

  static DEFAULT_WS_URLS = new Map<NetworkString, string>([
    ['liquid', BlockstreamExplorerURLs.websocketExplorerURL],
    ['testnet', BlockstreamTestnetExplorerURLs.websocketExplorerURL],
    ['regtest', NigiriDefaultExplorerURLs.websocketExplorerURL],
  ]);

  async getStatus(): Promise<AppStatus> {
    const statusValues = await Browser.storage.local.get([
      AppStorageKeys.ONBOARDING_COMPLETED,
      AppStorageKeys.AUTHENTICATED,
      AppStorageKeys.VERIFIED_MNEMONIC,
    ]);
    return {
      isAuthenticated: statusValues[AppStorageKeys.AUTHENTICATED] ?? false,
      isOnboardingCompleted: statusValues[AppStorageKeys.ONBOARDING_COMPLETED] ?? false,
      isMnemonicVerified: statusValues[AppStorageKeys.VERIFIED_MNEMONIC] ?? false,
    };
  }

  updateStatus(status: Partial<AppStatus>): Promise<void> {
    const setRecord: Record<string, boolean> = {};
    if (status.isOnboardingCompleted !== undefined) {
      setRecord[AppStorageKeys.ONBOARDING_COMPLETED] = status.isOnboardingCompleted;
    }
    if (status.isAuthenticated !== undefined) {
      setRecord[AppStorageKeys.AUTHENTICATED] = status.isAuthenticated;
    }
    if (status.isMnemonicVerified !== undefined) {
      setRecord[AppStorageKeys.VERIFIED_MNEMONIC] = status.isMnemonicVerified;
    }
    return Browser.storage.local.set(setRecord);
  }

  async getNetwork(): MaybeNull<NetworkString> {
    const { [AppStorageKeys.NETWORK]: value } = await Browser.storage.local.get(
      AppStorageKeys.NETWORK
    );
    return value ? value : null;
  }

  async getWebsocketExplorerURL(net?: NetworkString): MaybeNull<string> {
    const network = net ?? (await this.getNetwork());
    if (!network) throw new Error('Network is not set, cannot fallback to default');
    const storageKey = WebsocketURLKey.make(network);

    const { [storageKey]: value } = await Browser.storage.local.get([storageKey]);
    if (value) return value;
    return AppStorageAPI.DEFAULT_WS_URLS.get(network) ?? null;
  }

  async getWebExplorerURL(net?: NetworkString): Promise<string | null> {
    const network = net ?? (await this.getNetwork());
    if (!network) throw new Error('Network is not set, cannot fallback to default');
    const storageKey = WebExplorerURLKey.make(network);

    const { [storageKey]: value } = await Browser.storage.local.get([storageKey]);
    if (value) return value;
    return AppStorageAPI.DEFAULT_WEB_URLS.get(network) ?? null;
  }

  async setWebExplorerURL(net: NetworkString, url: string): Promise<void> {
    const storageKey = WebExplorerURLKey.make(net);
    return Browser.storage.local.set({ [storageKey]: url });
  }

  async getChainSource(net?: NetworkString | undefined): Promise<ChainSource | null> {
    const wsURL = await this.getWebsocketExplorerURL(net);
    if (!wsURL) return null;
    try {
      const client = new ElectrumWS(wsURL);
      return new WsElectrumChainSource(client);
    } catch (e) {
      console.error('Error while creating chain source', e);
      return null;
    }
  }

  setWebsocketExplorerURLs(record: Partial<Record<NetworkString, string>>): Promise<void> {
    const setRecord: Record<string, string> = {};
    for (const [network, url] of Object.entries(record)) {
      setRecord[WebsocketURLKey.make(network as NetworkString)] = url;
    }
    return Browser.storage.local.set(setRecord);
  }

  async getEnabledSites(): Promise<string[]> {
    const { [AppStorageKeys.ENABLED_SITES]: value } = await Browser.storage.local.get(
      AppStorageKeys.ENABLED_SITES
    );
    return value ? value : [];
  }

  async enableSite(url: string): Promise<void> {
    const enabledSites = await this.getEnabledSites();
    if (!enabledSites.includes(url)) {
      enabledSites.push(url);
      return Browser.storage.local.set({ [AppStorageKeys.ENABLED_SITES]: enabledSites });
    }
  }

  async disableSite(url: string): Promise<void> {
    const enabledSites = await this.getEnabledSites();
    const index = enabledSites.indexOf(url);
    if (index !== -1) return;
    return Browser.storage.local.set({
      [AppStorageKeys.ENABLED_SITES]: enabledSites.splice(index, 1),
    });
  }

  async setNetwork(network: NetworkString): Promise<void> {
    return Browser.storage.local.set({ [AppStorageKeys.NETWORK]: network });
  }

  onHostnameEnabled(callback: (websiteEnabled: string) => Promise<void>) {
    return Browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      const changesEnabledSites = changes[AppStorageKeys.ENABLED_SITES];
      if (changesEnabledSites) {
        const oldVal = (changesEnabledSites.oldValue as string[]) ?? [];
        const newVal = (changesEnabledSites.newValue as string[]) ?? [];
        const added = newVal.filter((v) => !oldVal.includes(v));
        await Promise.allSettled(added.map(callback));
      }
    });
  }

  onNetworkChanged(callback: (network: NetworkString) => Promise<void>): void {
    return Browser.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName !== 'local') return;
      const changesNetwork = changes[AppStorageKeys.NETWORK];
      if (changesNetwork) {
        const oldVal = changesNetwork.oldValue as NetworkString;
        const newVal = changesNetwork.newValue as NetworkString;
        if (oldVal !== newVal) await callback(newVal);
      }
    });
  }

  clear(): Promise<void> {
    return Browser.storage.local.clear();
  }
}
