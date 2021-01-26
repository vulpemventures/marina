import { BrowserStorageAppRepo } from './app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from './wallet/browser/browser-storage-wallet-repository';
import { IAppRepository } from '../domain/app/i-app-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';
import { App } from '../domain/app/app';
import {
  testApp,
  testAppDTO,
  testAppOnboarded,
  testAppOnboardedDTO,
} from '../../__test__/fixtures/test-app';
import { testWallet, testWalletDTO, testWalletProps } from '../../__test__/fixtures/test-wallet';

// Mock for UniqueEntityID
jest.mock('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4 } = require('uuid');

describe('Repositories', () => {
  const repos = {
    app: new BrowserStorageAppRepo() as IAppRepository,
    wallet: new BrowserStorageWalletRepo() as IWalletRepository,
  };

  beforeAll(() => {
    v4.mockImplementation(() => 'test-id');
  });

  describe('App repository', () => {
    test('Should init app', () => {
      // Call to set() will fail if it doesn't match invocation triggered by init()
      mockBrowser.storage.local.set.expect({ app: testAppOnboardedDTO }).andResolve();
      return expect(repos.app.init(testAppOnboarded)).resolves.toBeUndefined();
    });

    test('Should throw with app not found', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({});
      return expect(repos.app.getApp()).rejects.toThrow('app not found');
    });

    test('Should retrieve initialAppState from repo', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
      return expect(repos.app.getApp()).resolves.toStrictEqual(testApp);
    });

    test('Should update app state', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
      // Call to set() will fail if it doesn't match invocation triggered by updateApp()
      mockBrowser.storage.local.set.expect({ app: testAppOnboardedDTO }).andResolve();
      return expect(
        repos.app.updateApp(
          (app: App): App => {
            app.props.isOnboardingCompleted = true;
            return app;
          }
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('Wallet repository', () => {
    test('Should init wallet', () => {
      mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();
      return expect(repos.wallet.init([testWallet])).resolves.toBeUndefined();
    });

    test('Should not found wallet at initialState', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [] });
      return expect(repos.wallet.getOrCreateWallet()).rejects.toThrow('wallet not found');
    });

    test('Should retrieve wallet from repo', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({
        wallets: [testWalletDTO],
      });
      return expect(repos.wallet.getOrCreateWallet()).resolves.toStrictEqual(testWallet);
    });

    test('Should create a wallet', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
      mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();
      return expect(repos.wallet.getOrCreateWallet(testWalletProps)).resolves.toStrictEqual(
        testWallet
      );
    });
  });
});
