import { AppDTO } from '../../../application/dtos/app-dto';
import { AppMap } from '../../../application/mappers/app-map';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { App } from '../../../domain/app/app';

interface AppStorage {
  app: AppDTO;
}

const storage: AppStorage = { app: {} as AppDTO };

export class MemoryStorageAppRepo implements IAppRepository {
  getApp(): Promise<App> {
    return Promise.resolve(AppMap.toDomain(storage.app));
  }
  updateApp(cb: (app: App) => App): Promise<void> {
    const updatedApp = cb(AppMap.toDomain(storage.app));
    storage.app = AppMap.toDTO(updatedApp);
    return Promise.resolve();
  }
}
