import { browser } from 'webextension-polyfill-ts';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { App } from '../../../domain/app/app';
import { AppMap } from '../../../application/mappers/app-map';
import { AppDTO } from '../../../application/dtos/app-dto';

export class BrowserStorageAppRepo implements IAppRepository {
  async init(app: App): Promise<void> {
    await browser.storage.local.set({
      app: AppMap.toDTO(app),
    });
  }

  async getApp(): Promise<App> {
    const { app } = (await browser.storage.local.get('app')) as { app: AppDTO };
    if (app === undefined) {
      throw new Error('app not found');
    }
    return AppMap.toDomain(app);
  }

  async updateApp(cb: (app: App) => App): Promise<void> {
    const app = await this.getApp();
    const updatedApp = cb(app);
    await browser.storage.local.set({
      app: AppMap.toDTO(updatedApp),
    });
  }
}
