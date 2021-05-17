import { IApp } from '../../domain/app';
import { createNetwork } from '../../domain/network';
import { AppDTO } from '../dtos/app-dto';

export class AppMap {
  public static toDTO(app: IApp): AppDTO {
    return {
      isAuthenticated: app.isAuthenticated,
      isWalletVerified: app.isWalletVerified,
      isOnboardingCompleted: app.isOnboardingCompleted,
      network: app.network,
    };
  }

  public static toDomain(raw: AppDTO): IApp {
    return {
      isAuthenticated: raw.isAuthenticated,
      isWalletVerified: raw.isWalletVerified,
      isOnboardingCompleted: raw.isOnboardingCompleted,
      network: createNetwork(raw.network),
    };
  }
}
