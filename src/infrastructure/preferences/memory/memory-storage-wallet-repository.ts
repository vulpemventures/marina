import { PreferencesDTO } from '../../../application/dtos/preferences-dto';
import { PreferencesMap } from '../../../application/mappers/preferences-map';
import { IPreferencesRepository } from '../../../domain/preferences/i-preferences-repository';
import { IPreferences } from '../../../domain/preferences/preferences';

interface PreferencesStorage {
  preferences: PreferencesDTO;
}

const storage: PreferencesStorage = { preferences: {} as PreferencesDTO };

export class MemoryStorageWalletRepo implements IPreferencesRepository {
  getPreferences(): Promise<IPreferences> {
    return Promise.resolve(PreferencesMap.toDomain(storage.preferences));
  }
  updatePreferences(cb: (pref: IPreferences) => IPreferences): Promise<void> {
    const updatedPref = cb(PreferencesMap.toDomain(storage.preferences));
    storage.preferences = PreferencesMap.toDTO(updatedPref);
    return Promise.resolve();
  }
}
