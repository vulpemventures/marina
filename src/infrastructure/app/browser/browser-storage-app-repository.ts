import { browser } from 'webextension-polyfill-ts';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { App } from '../../../domain/app/app';
import { AppMap } from '../../../application/mappers/app-map';
import { AppDTO } from '../../../application/dtos/app-dto';

export class BrowserStorageAppRepo implements IAppRepository {
  async getApp(): Promise<App> {
    const { app } = (await browser.storage.local.get('app')) as { app: AppDTO };
    if (app) {
      return AppMap.toDomain(app);
    }
    return App.createApp({
      isAuthenticated: false,
      isWalletVerified: false,
      isOnboardingCompleted: false,
    });
  }

  async updateApp(cb: (app: App) => App): Promise<void> {
    const app = await this.getApp();
    const updatedApp = cb(app);
    await browser.storage.local.set({
      app: AppMap.toDTO(updatedApp),
    });
  }
}
