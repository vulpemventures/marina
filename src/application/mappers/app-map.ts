import { App } from '../../domain/app/app';
import { AppDTO } from '../dtos/app-dto';

export class AppMap {
  public static toDTO(app: App): AppDTO {
    return {
      isAuthenticated: app.isAuthenticated,
      isWalletVerified: app.isWalletVerified,
      isOnboardingCompleted: app.isOnboardingCompleted,
    };
  }

  public static toDomain(raw: AppDTO): App {
    return App.createApp({
      isAuthenticated: raw.isAuthenticated,
      isWalletVerified: raw.isWalletVerified,
      isOnboardingCompleted: raw.isOnboardingCompleted,
    });
  }
}
