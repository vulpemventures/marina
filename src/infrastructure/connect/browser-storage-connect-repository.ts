import { browser } from 'webextension-polyfill-ts';
import { IConnectRepository } from '../../domain/connect/i-connect-repository';
import { Network } from '../../domain/app/value-objects';
import { ConnectData, ConnectDataByNetwork } from '../../domain/connect';
import { parse, stringify } from '../../application/utils/browser-storage-converters';

export class BrowserStorageConnectRepo implements IConnectRepository {
  async addConnectData(data: ConnectData, network: Network['value']): Promise<void> {
    if (!network) throw new Error('Network is required');
    try {
      const currentConnectData = await this.getConnectData();
      let newLiquidConnectData = currentConnectData.liquid;
      let newRegtestConnectData = currentConnectData.regtest;
      if (network === 'liquid') {
        newLiquidConnectData = { ...currentConnectData.liquid, ...data };
      } else {
        newRegtestConnectData = { ...currentConnectData.regtest, ...data };
      }
      const newConnectData = {
        regtest: stringify(newRegtestConnectData),
        liquid: stringify(newLiquidConnectData),
      };
      await browser.storage.local.set({ connect: newConnectData });
    } catch (error) {
      throw new Error(error);
    }
  }

  async getConnectData(): Promise<ConnectDataByNetwork> {
    try {
      const { connect } = await browser.storage.local.get('connect');
      // Only check that assets is not undefined but can be empty
      if (!connect) {
        throw new Error('connect data not found');
      }
      const liquid = parse(connect.liquid);
      const regtest = parse(connect.regtest);
      return { liquid, regtest };
    } catch (error) {
      throw new Error(error);
    }
  }

  async init(data: ConnectDataByNetwork): Promise<void> {
    try {
      await browser.storage.local.set({
        connect: { regtest: stringify(data.regtest), liquid: stringify(data.liquid) },
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  async updateConnectData(cb: (data: ConnectDataByNetwork) => ConnectDataByNetwork): Promise<void> {
    try {
      const connectData = await this.getConnectData();
      const updatedConnectData = cb(connectData);
      await browser.storage.local.set({
        connect: {
          regtest: stringify(updatedConnectData.regtest),
          liquid: stringify(updatedConnectData.liquid),
        },
      });
    } catch (error) {
      throw new Error(error);
    }
  }
}
