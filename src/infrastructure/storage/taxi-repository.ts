import type { Asset, NetworkString } from 'marina-provider';
import Browser from 'webextension-polyfill';
import type { AppRepository, AssetRepository, TaxiRepository } from '../repository';
import { DynamicStorageKey } from './dynamic-key';

export const TaxiURLKey = new DynamicStorageKey<[network: NetworkString]>('taxiURL');
export const TaxiAssetsKey = new DynamicStorageKey<[network: NetworkString]>('taxiAssets');

export class TaxiStorageAPI implements TaxiRepository {
  constructor(private assetRepository: AssetRepository, private appRepository: AppRepository) {}

  async getTaxiURL(network: NetworkString): Promise<string> {
    const key = TaxiURLKey.make(network);
    const { [key]: url } = await Browser.storage.local.get(key);
    if (!url) {
      throw new Error(`Taxi URL not found for network ${network}`);
    }
    return url;
  }

  setTaxiAssets(network: NetworkString, assets: string[]): Promise<void> {
    const key = TaxiAssetsKey.make(network);
    return Browser.storage.local.set({ [key]: assets });
  }

  private async getTaxiAssetsHashes(network: NetworkString): Promise<string[]> {
    const key = TaxiAssetsKey.make(network);
    const { [key]: assets } = await Browser.storage.local.get(key);
    return assets ? (assets as string[]) : [];
  }

  async getTaxiAssets(network?: NetworkString): Promise<(Asset | string)[]> {
    network = network ?? (await this.appRepository.getNetwork()) ?? undefined;
    if (!network) throw new Error('Network not set');
    const hashes = await this.getTaxiAssetsHashes(network);
    const result = await Promise.allSettled(
      hashes.map((hash) => this.assetRepository.getAsset(hash))
    );
    return result.map((r, i) => (r.status === 'fulfilled' && r.value ? r.value : hashes[i]));
  }
}
