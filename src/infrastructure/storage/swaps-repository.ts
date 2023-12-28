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

  private async getSwapDataWithoutSwap(swap: SwapParams): Promise<SwapParams[]> {
    const currentData = await this.getSwapData();
    return currentData.filter((x) => x.redeemScript !== swap.redeemScript);
  }

  async reset(): Promise<void> {
    return Browser.storage.local.remove(SwapsStorageKeys.SWAPS_DATA);
  }

  async addSwap(swap: SwapParams): Promise<void> {
    const currentData = await this.getSwapData();
    return await this.setSwapData([...currentData, swap]);
  }

  async findSwapWithAddress(address: string): Promise<SwapParams | undefined> {
    return (await this.getSwapData()).find((s) => s.fundingAddress === address);
  }

  async findSwapWithTxid(txid: string): Promise<SwapParams | undefined> {
    return (await this.getSwapData()).find((s) => s.txid === txid);
  }

  async getSwaps(): Promise<SwapParams[]> {
    return await this.getSwapData();
  }

  async removeSwap(swap: SwapParams): Promise<void> {
    const dataWithoutSwap = await this.getSwapDataWithoutSwap(swap);
    return await this.setSwapData(dataWithoutSwap);
  }

  async updateSwap(swap: SwapParams): Promise<void> {
    const dataWithoutSwap = await this.getSwapDataWithoutSwap(swap);
    return await this.setSwapData([...dataWithoutSwap, swap]);
  }
}
