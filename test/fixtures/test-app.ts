import { AppDTO } from '../../src/application/dtos/app-dto';
import { App, IApp } from '../../src/domain/app/app';
import { Network } from '../../src/domain/app/value-objects';

// Mock for UniqueEntityID
jest.mock('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4 } = require('uuid');
v4.mockImplementation(() => 'test-id');

// Initial
export const testAppDTO: AppDTO = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: 'regtest',
};
export const testAppProps: IApp = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: Network.create('regtest'),
};
export const testApp: App = App.createApp(testAppProps);

// Onboarding
export const testAppOnboardedDTO: AppDTO = {
  isAuthenticated: false,
  isOnboardingCompleted: true,
  isWalletVerified: false,
  network: 'regtest',
};
export const testAppOnboardedProps: IApp = {
  isAuthenticated: false,
  isOnboardingCompleted: true,
  isWalletVerified: false,
  network: Network.create('regtest'),
};
export const testAppOnboarded: App = App.createApp(testAppOnboardedProps);

// Wallet Verified
export const testAppWalletVerifiedDTO: AppDTO = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: true,
  network: 'regtest',
};
export const testAppWalletVerifiedProps: IApp = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: true,
  network: Network.create('regtest'),
};
export const testAppWalletVerified: App = App.createApp(testAppWalletVerifiedProps);

// Authenticated
export const testAppAuthenticatedDTO: AppDTO = {
  isAuthenticated: true,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: 'regtest',
};
export const testAppAuthenticatedProps: IApp = {
  isAuthenticated: true,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: Network.create('regtest'),
};
export const testAppAuthenticated: App = App.createApp(testAppAuthenticatedProps);

// Liquid Network
export const testAppNetworkLiquidDTO: AppDTO = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: 'liquid',
};
export const testAppNetworkLiquidProps: IApp = {
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isWalletVerified: false,
  network: Network.create('liquid'),
};
export const testAppNetworkLiquid: App = App.createApp(testAppAuthenticatedProps);
