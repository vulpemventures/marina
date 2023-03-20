import type { Asset, NetworkString } from 'marina-provider';
import Browser from 'webextension-polyfill';
import type { AppRepository, AssetRepository, TaxiRepository } from '../../domain/repository';
import { DynamicStorageKey } from './dynamic-key';

export const TaxiURLKey = new DynamicStorageKey<[network: NetworkString]>('taxiURL');
export const TaxiAssetsKey = new DynamicStorageKey<[network: NetworkString]>('taxiAssets');

export class TaxiStorageAPI implements TaxiRepository {
  static DEFAULT_TAXI_URLS: Record<NetworkString, string | undefined> = {
    regtest: 'http://localhost:8000',
    testnet: 'https://stage-api.liquid.taxi/v1',
    liquid: 'https://grpc.liquid.taxi/v1',
  };

  constructor(private assetRepository: AssetRepository, private appRepository: AppRepository) {}

  async setTaxiURLs(record: Partial<Record<NetworkString, string>>): Promise<void> {
    return Browser.storage.local.set(
      Object.entries(record).reduce<Record<string, string>>((acc, [network, url]) => {
        if (!url) return acc;
        acc[TaxiURLKey.make(network as NetworkString)] = url;
        return acc;
      }, {})
    );
  }

  async getTaxiURL(network: NetworkString): Promise<string> {
    const key = TaxiURLKey.make(network);
    let { [key]: url } = await Browser.storage.local.get(key);
    if (!url) {
      url = TaxiStorageAPI.DEFAULT_TAXI_URLS[network];
      if (!url) throw new Error(`Taxi URL not set for network ${network}`);
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
