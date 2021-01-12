import { IPreferences } from './preferences';

type CallbackType = (preferences: IPreferences) => IPreferences;

export interface IPreferencesRepository {
  getPreferences(): Promise<IPreferences>;
  updatePreferences(cb: CallbackType): Promise<void>;
}
