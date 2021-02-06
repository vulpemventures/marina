import { browser } from 'webextension-polyfill-ts';
import { Assets, AssetsByNetwork } from '../../domain/asset';
import { IAssetsRepository } from '../../domain/asset/i-assets-repository';
import { Network } from '../../domain/app/value-objects';

export class BrowserStorageAssetsRepo implements IAssetsRepository {
  async addAssets(assets: Assets, network: Network['value']): Promise<void> {
    if (!network) throw new Error('Network is required');
    const currentAssets = await this.getAssets();
    let newLiquidAssets = currentAssets.liquid;
    let newRegtestAssets = currentAssets.regtest;
    if (network === 'liquid') {
      newLiquidAssets = { ...currentAssets.liquid, ...assets };
    } else {
      newRegtestAssets = { ...currentAssets.regtest, ...assets };
    }
    const newAssets = { regtest: newRegtestAssets, liquid: newLiquidAssets };
    await browser.storage.local.set({
      assets: newAssets,
    });
  }

  async getAssets(): Promise<any> {
    try {
      const assets = await browser.storage.local.get('assets');
      if (!assets) {
        throw new Error('assets not found');
      }
      return assets;
    } catch (error) {
      console.log(error);
    }
  }

  async init(assets: AssetsByNetwork): Promise<void> {
    try {
      await browser.storage.local.set({ assets });
    } catch (error) {
      console.log(error);
    }
  }

  async updateAssets(cb: (assets: AssetsByNetwork) => AssetsByNetwork): Promise<void> {
    try {
      const assets = await this.getAssets();
      const updatedAssets = cb(assets);
      await browser.storage.local.set({ assets: updatedAssets });
    } catch (error) {
      console.log(error);
    }
  }
}
