import Browser from 'webextension-polyfill';
import type { RefundableSwapParams, RefundableSwapsRepository } from '../../domain/repository';

enum SwapsStorageKeys {
  SWAPS_DATA = 'swapsData',
}

export class RefundableSwapsStorageAPI implements RefundableSwapsRepository {
  private async getSwapData(): Promise<RefundableSwapParams[]> {
    const data = await Browser.storage.local.get(SwapsStorageKeys.SWAPS_DATA);
    if (!data[SwapsStorageKeys.SWAPS_DATA]) return [];
    return data[SwapsStorageKeys.SWAPS_DATA];
  }

  private async setSwapData(data: RefundableSwapParams[]): Promise<void> {
    console.log('setting swap storage', data); // TODO remove this
    return Browser.storage.local.set({
      [SwapsStorageKeys.SWAPS_DATA]: data,
    });
  }

  private async getSwapDataWithoutSwap(
    swap: RefundableSwapParams
  ): Promise<RefundableSwapParams[]> {
    const currentData = await this.getSwapData();
    return currentData.filter((x) => x.redeemScript !== swap.redeemScript);
  }

  async reset(): Promise<void> {
    return Browser.storage.local.remove(SwapsStorageKeys.SWAPS_DATA);
  }

  async addSwap(swap: RefundableSwapParams): Promise<void> {
    const currentData = await this.getSwapData();
    return await this.setSwapData([...currentData, swap]);
  }

  async findSwapWithAddress(address: string): Promise<RefundableSwapParams | undefined> {
    return (await this.getSwapData()).find(
      (s) => s.fundingAddress === address || s.confidentialAddress === address
    );
  }

  async findSwapWithTxid(txid: string): Promise<RefundableSwapParams | undefined> {
    return (await this.getSwapData()).find((s) => s.txid === txid);
  }

  async getSwaps(): Promise<RefundableSwapParams[]> {
    return await this.getSwapData();
  }

  async removeSwap(swap: RefundableSwapParams): Promise<void> {
    const dataWithoutSwap = await this.getSwapDataWithoutSwap(swap);
    return await this.setSwapData(dataWithoutSwap);
  }

  async updateSwap(swap: RefundableSwapParams): Promise<void> {
    const dataWithoutSwap = await this.getSwapDataWithoutSwap(swap);
    return await this.setSwapData([...dataWithoutSwap, swap]);
  }
}
