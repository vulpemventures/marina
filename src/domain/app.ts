import { IError } from './common';
import { Network } from './network';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isWalletVerified: boolean;
  isOnboardingCompleted: boolean;
  network: Network;
  explorerByNetwork: Record<Network, string>;
  webExplorer: string;
}
