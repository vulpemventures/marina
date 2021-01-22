import { BrowserStorageAppRepo } from './app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from './wallet/browser/browser-storage-wallet-repository';
import { IAppRepository } from '../domain/app/i-app-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';
import { App } from '../domain/app/app';
import { IWallet, Wallet } from '../domain/wallet/wallet';
import {
  Address,
  EncryptedMnemonic,
  MasterBlindingKey,
  MasterXPub,
  PasswordHash,
} from '../domain/wallet/value-objects';
import { Network } from '../domain/app/value-objects';
import {
  addresses,
  encryptedMnemonic,
  masterXPub,
  masterBlindingKey,
  passwordHash,
} from './fixtures/wallet.json';
import { WalletDTO } from '../application/dtos/wallet-dto';
import { AppDTO } from '../application/dtos/app-dto';

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
    let testApp: App, testAppOnboarded: App, testAppDTO: AppDTO, testAppDTOOnboarded: AppDTO;

    beforeAll(() => {
      testAppDTO = {
        isAuthenticated: false,
        isOnboardingCompleted: false,
        isWalletVerified: false,
        network: 'regtest',
      };

      testAppDTOOnboarded = {
        isAuthenticated: false,
        isOnboardingCompleted: true,
        isWalletVerified: false,
        network: 'regtest',
      };

      testApp = App.createApp({
        isAuthenticated: false,
        isOnboardingCompleted: false,
        isWalletVerified: false,
        network: Network.create('regtest'),
      });

      testAppOnboarded = App.createApp({
        isAuthenticated: false,
        isOnboardingCompleted: true,
        isWalletVerified: false,
        network: Network.create('regtest'),
      });
    });

    test('Should init app', () => {
      // Call to set() will fail if it doesn't match invocation triggered by init()
      mockBrowser.storage.local.set.expect({ app: testAppDTOOnboarded }).andResolve();
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
      mockBrowser.storage.local.set.expect({ app: testAppDTOOnboarded }).andResolve();
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
    let testWallet: Wallet, testWalletDTO: WalletDTO, testWalletProps: IWallet;

    beforeAll(() => {
      testWalletProps = {
        confidentialAddresses: [Address.create(addresses.liquid.blech32[0])],
        encryptedMnemonic: EncryptedMnemonic.create(encryptedMnemonic),
        masterXPub: MasterXPub.create(masterXPub),
        masterBlindingKey: MasterBlindingKey.create(masterBlindingKey),
        passwordHash: PasswordHash.create(passwordHash),
      };

      testWallet = Wallet.createWallet(testWalletProps);

      testWalletDTO = {
        confidentialAddresses: [addresses.liquid.blech32[0]],
        encryptedMnemonic: encryptedMnemonic,
        masterXPub: masterXPub,
        masterBlindingKey: masterBlindingKey,
        passwordHash: passwordHash,
        walletId: v4(),
      };
    });

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
