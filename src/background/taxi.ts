import axios from 'axios';
import Browser from 'webextension-polyfill';
import { TaxiAssetDetails } from '../domain/taxi';
import { AppRepository, TaxiRepository } from '../infrastructure/repository';

// set up a Browser.alarms in order to fetch the taxi assets every minute
export class TaxiUpdater {
  static ALARM = 'taxi-updater';

  constructor(private taxiRepository: TaxiRepository, private appRepository: AppRepository) {
  }

  async start() {
    Browser.alarms.create(TaxiUpdater.ALARM, { periodInMinutes: 1 });
    Browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === TaxiUpdater.ALARM) {
        try {
          await this.update();
        } catch (e) {
          console.error(e);
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
  }

}

async function fetchAssetsFromTaxi(taxiUrl: string): Promise<string[]> {
  const { data } = await axios.get(`${taxiUrl}/assets`);
  return data.assets.map((asset: TaxiAssetDetails) => asset.assetHash);
};