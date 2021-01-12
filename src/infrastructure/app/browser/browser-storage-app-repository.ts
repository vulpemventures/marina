import { browser } from 'webextension-polyfill-ts';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { App } from '../../../domain/app/app';
import { AppMap } from '../../../application/mappers/app-map';
import { AppDTO } from '../../../application/dtos/app-dto';

export class BrowserStorageAppRepo implements IAppRepository {
  async getApp(): Promise<App> {
    const store = await browser.storage.local.get('app');
    if (store && store.App) {
      return AppMap.toDomain(store.App as AppDTO)
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
