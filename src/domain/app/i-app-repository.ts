import { App } from './app';

type CallbackType = (app: App) => App;

export interface IAppRepository {
  getApp(): Promise<App>;
  updateApp(cb: CallbackType): Promise<void>;
}
