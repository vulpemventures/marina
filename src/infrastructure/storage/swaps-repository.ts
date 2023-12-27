import Browser from 'webextension-polyfill';
import type { SwapParams, SwapsRepository } from '../../domain/repository';

enum SwapsStorageKeys {
  SWAPS_DATA = 'swapsData',
}

export class SwapsStorageAPI implements SwapsRepository {
  private async getSwapData(): Promise<SwapParams[]> {
    const data = await Browser.storage.local.get(SwapsStorageKeys.SWAPS_DATA);
    if (!data[SwapsStorageKeys.SWAPS_DATA]) return [];
    return data[SwapsStorageKeys.SWAPS_DATA];
  }

  private async setSwapData(data: SwapParams[]): Promise<void> {
    console.log('setting swap storage', data); // TODO remove this
    return Browser.storage.local.set({
      [SwapsStorageKeys.SWAPS_DATA]: data,
    });
  }

  async reset(): Promise<void> {
    return Browser.storage.local.remove(SwapsStorageKeys.SWAPS_DATA);
  }

  async addSwap(swap: SwapParams): Promise<void> {
    const currentData = await this.getSwapData();
    currentData.push(swap);
    return await this.setSwapData(currentData);
  }

  async getSwaps(): Promise<SwapParams[]> {
    return await this.getSwapData();
  }

  async removeSwap(swap: SwapParams): Promise<void> {
    const currentData = await this.getSwapData();
    const data = currentData.filter((x) => x.redeemScript !== swap.redeemScript);
    return await this.setSwapData(data);
  }
}
