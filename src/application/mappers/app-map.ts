import { App } from '../../domain/app/app';
import { Network } from '../../domain/app/value-objects/network';
import { AppDTO } from '../dtos/app-dto';

export class AppMap {
  public static toDTO(app: App): AppDTO {
    return {
      isAuthenticated: app.isAuthenticated,
      isWalletVerified: app.isWalletVerified,
      isOnboardingCompleted: app.isOnboardingCompleted,
      network: app.network.value,
    };
  }

  public static toDomain(raw: AppDTO): App {
    return App.createApp({
      isAuthenticated: raw.isAuthenticated,
      isWalletVerified: raw.isWalletVerified,
      isOnboardingCompleted: raw.isOnboardingCompleted,
      network: Network.create(raw.network),
    });
  }
}
