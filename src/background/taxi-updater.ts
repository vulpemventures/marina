import Browser from 'webextension-polyfill';
import { fetchAsset } from '../application/utils';
import type { AppRepository, AssetRepository, TaxiRepository } from '../domain/repository';

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

    const webExplorerURL = await this.appRepository.getWebExplorerURL();
    if (!webExplorerURL) {
      console.warn('Web explorer URL not set, cannot fetch taxi assets details');
      return;
    }

    for (const asset of assets) {
      const assetDetails = await this.assetRepository.getAsset(asset);
      if (assetDetails && assetDetails.name !== 'Unknown') continue;
      try {
        const assetFromExplorer = await fetchAsset(webExplorerURL, asset);
        await this.assetRepository.addAsset(asset, assetFromExplorer);
      } catch (e) {
        await this.assetRepository.addAsset(asset, {
          name: 'Unknown',
          ticker: asset.substring(0, 4),
          precision: 8,
          assetHash: asset,
        });
        console.warn(e);
        continue;
      }
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
