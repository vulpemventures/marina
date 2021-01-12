import { IError } from '../common';

export interface IPreferences {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isWalletVerified: boolean;
  isOnboardingCompleted: boolean;
}
