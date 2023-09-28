import { networks } from 'liquidjs-lib';
import type { Asset, NetworkString } from 'marina-provider';
import Browser from 'webextension-polyfill';
import type { AssetRepository } from '../../domain/repository';
import { DynamicStorageKey } from './dynamic-key';

export const AssetKey = new DynamicStorageKey<[assethash: string]>('asset');

const LIQUID_BTC = (hash: string) => ({
  assetHash: hash,
  name: 'Liquid Bitcoin',
  ticker: 'L-BTC',
  precision: 8,
});

export class AssetStorageAPI implements AssetRepository {
  static HARDCODED_ASSETS: Record<NetworkString, Record<string, Asset>> = {
    liquid: {
      [networks.liquid.assetHash]: LIQUID_BTC(networks.liquid.assetHash),
    },
    regtest: {
      [networks.regtest.assetHash]: LIQUID_BTC(networks.regtest.assetHash),
    },
    testnet: {
      [networks.testnet.assetHash]: LIQUID_BTC(networks.testnet.assetHash),
    },
  };

  static isFeaturedAsset(assetHash: string): boolean {
    return Object.values(AssetStorageAPI.HARDCODED_ASSETS).some((assets) =>
      Object.keys(assets).includes(assetHash)
    );
  }

  static getFeaturedAsset(assetHash: string): Asset | undefined {
    return Object.values(AssetStorageAPI.HARDCODED_ASSETS).find((assets) =>
      Object.keys(assets).includes(assetHash)
    )?.[assetHash];
  }

  async getAsset(assetHash: string): Promise<Asset | undefined> {
    if (AssetStorageAPI.isFeaturedAsset(assetHash)) {
      return AssetStorageAPI.getFeaturedAsset(assetHash);
    }

    const key = AssetKey.make(assetHash);
    const { [key]: assetdetails } = await Browser.storage.local.get(key);
    return assetdetails === null ? undefined : assetdetails;
  }

  addAsset(assethash: string, asset: Asset): Promise<void> {
    return Browser.storage.local.set({ [AssetKey.make(assethash)]: asset });
  }

  async getAllAssets(network: NetworkString): Promise<Asset[]> {
    const assetList: Asset[] = [];

    const allStorage = await Browser.storage.local.get(null);
    for (const [key, value] of Object.entries(allStorage)) {
      if (AssetKey.is(key) && value) {
        assetList.push(value);
      }
    }

    for (const asset of Object.values(AssetStorageAPI.HARDCODED_ASSETS[network])) {
      if (!assetList.find((a) => a.assetHash === asset.assetHash)) {
        assetList.push(asset);
      } else {
        const index = assetList.findIndex((a) => a.assetHash === asset.assetHash);
        assetList[index] = asset;
      }
    }

    return assetList;
  }

  onNewAsset(callback: (asset: Asset) => void) {
    const listener = (changes: Browser.Storage.StorageChange, areaName: string) => {
      if (areaName !== 'local') return;
      for (const [key, change] of Object.entries(changes)) {
        if (AssetKey.is(key) && change.newValue) {
          callback(change.newValue);
        }
      }
    };

    Browser.storage.onChanged.addListener(listener);
    return () => Browser.storage.onChanged.removeListener(listener);
  }
}
