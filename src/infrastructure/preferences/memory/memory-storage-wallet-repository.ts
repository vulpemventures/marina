import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IPreferences } from '../../../domain/preferences/preferences';

interface PreferencesStorage {
  preferences: IPreferences;
}

const storage: PreferencesStorage = { preferences: {} as IPreferences };

export class MemoryStorageWalletRepo implements IPreferencesRepository {
  getPreferences(): Promise<IPreferences> {
    return Promise.resolve(storage.preferences);
  }
  async updatePreferences(cb: (pref: IPreferences) => IPreferences): Promise<void> {
    const updatedPref = cb(storage.preferences);
    storage.preferences = updatedPref;
  }
}
