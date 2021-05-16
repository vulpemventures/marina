import { Network } from '../../domain/app/value-objects';

export interface AppDTO {
  isAuthenticated: boolean;
  isWalletVerified: boolean;
  isOnboardingCompleted: boolean;
  network: NetworkValue;
}
