import Browser from 'webextension-polyfill';
import type { AppRepository, AssetRepository, TaxiRepository } from '../domain/repository';
import { DefaultAssetRegistry } from '../port/asset-registry';

// set up a Browser.alarms in order to fetch the taxi assets every minute
export class TaxiUpdater {
  static ALARM = 'taxi-updater';

  constructor(
    private taxiRepository: TaxiRepository,
    private appRepository: AppRepository,
    private assetRepository: AssetRepository
  ) {}

  start() {
    this.appRepository.onNetworkChanged(async (network) => {
      if (network) {
        await this.update();
      }
    });

    Browser.alarms.create(TaxiUpdater.ALARM, { periodInMinutes: 1 });
    Browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === TaxiUpdater.ALARM) {
        try {
          await this.update();
        } catch (e) {
          // ignore errors
          console.warn(e);
        }
      }
    });
  }

  async stop() {
    await Browser.alarms.clear(TaxiUpdater.ALARM).catch(console.error); // ignore errors
  }

  private async update() {
    const network = await this.appRepository.getNetwork();
    if (!network) throw new Error('Network not set');
    const taxiURL = await this.taxiRepository.getTaxiURL(network);
    if (!taxiURL) throw new Error('Taxi URL not set');
    const assets = await fetchAssetsFromTaxi(taxiURL);
    await this.taxiRepository.setTaxiAssets(network, assets);

    const assetRegistry = new DefaultAssetRegistry(network);

    for (const asset of assets) {
      const assetDetails = await this.assetRepository.getAsset(asset);
      if (assetDetails && assetDetails.ticker !== assetDetails.assetHash.substring(0, 4)) continue;
      const newAssetDetails = await assetRegistry.getAsset(asset);
      await this.assetRepository.addAsset(asset, newAssetDetails);
    }
  }
}

interface TaxiAssetDetails {
  assetHash: string;
  assetPrice: number;
  basisPoint: number;
}

async function fetchAssetsFromTaxi(taxiUrl: string): Promise<string[]> {
  const response = await fetch(`${taxiUrl}/assets`);
  const data = await response.json();
  return (data.assets ?? []).map((asset: TaxiAssetDetails) => asset.assetHash);
}
