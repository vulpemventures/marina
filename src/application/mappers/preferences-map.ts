import { IPreferences } from '../../domain/preferences/preferences';
import { PreferencesDTO } from '../dtos/preferences-dto';

export class PreferencesMap {
  public static toDTO(pref: IPreferences): PreferencesDTO {
    return {
      isAuthenticated: pref.isAuthenticated,
      isWalletVerified: pref.isWalletVerified,
      isOnboardingCompleted: pref.isOnboardingCompleted,
    };
  }

  public static toDomain(raw: PreferencesDTO): IPreferences {
    return {
      isAuthenticated: raw.isAuthenticated,
      isWalletVerified: raw.isWalletVerified,
      isOnboardingCompleted: raw.isOnboardingCompleted,
    };
  }
}
