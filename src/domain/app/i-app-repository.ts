import { App } from './app';

type CallbackType = (app: App) => App;

export interface IAppRepository {
  init(app: App): Promise<void>;
  getApp(): Promise<App>;
  updateApp(cb: CallbackType): Promise<void>;
}
