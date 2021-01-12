import { browser } from 'webextension-polyfill-ts';
import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IPreferences } from '../../../domain/preferences/preferences';
import { PreferencesMap } from '../../../application/mappers/preferences-map';
import { PreferencesDTO } from '../../../application/dtos/preferences-dto';

export class BrowserStoragePreferencestRepo implements IPreferencesRepository {
  async getPreferences(): Promise<IPreferences> {
    const store = await browser.storage.local.get('preferences');
    if (store && store.preferences) {
      return PreferencesMap.toDomain(store.preferences as PreferencesDTO)
    }
    return {} as IPreferences;
  }

  async updatePreferences(cb: (pref: IPreferences) => IPreferences): Promise<void> {
    const pref = await this.getPreferences();
    const updatedPref = cb(pref);
    await browser.storage.local.set({
      preferences: PreferencesMap.toDTO(updatedPref),
    });
  }
}
