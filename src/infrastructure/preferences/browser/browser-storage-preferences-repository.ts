import { browser } from 'webextension-polyfill-ts';
import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IPreferences } from '../../../domain/preferences/preferences';
// import { WalletMap } from '../../../application/mappers/wallet-map';
// import { WalletDTO } from '../../../application/dtos/wallet-dto';

export class BrowserStoragePreferencestRepo implements IPreferencesRepository {
  async getPreferences(): Promise<IPreferences> {
    const store = await browser.storage.local.get('preferences');
    return store.preferences ? store.preferences : {};
  }

  async updatePreferences(cb: (pref: IPreferences) => IPreferences): Promise<void> {
    const pref = await this.getPreferences();
    const updatedPref = cb(pref);
    await browser.storage.local.set({ preferences: updatedPref });
  }
}
