import { createWallet, deriveNewAddress, initWallet, restoreWallet } from './wallet';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../reducers';
import { assetInitState } from '../reducers/asset-reducer';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import {
  testWalletDTO,
  testWalletProps,
  testWalletRestoredProps,
  testWalletWith2ConfidentialAddrDTO,
  testWalletWith2ConfidentialAddrProps,
  testWalletWithConfidentialAddrDTO,
  testWalletWithConfidentialAddrProps,
} from '../../../../__test__/fixtures/test-wallet';
import { mnemonic, password } from '../../../../__test__/fixtures/wallet.json';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { BrowserStorageAssetsRepo } from '../../../infrastructure/assets/browser-storage-assets-repository';
import { IAssetsRepository } from '../../../domain/asset/i-assets-repository';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Wallet Actions', () => {
  let repos, store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
    repos = {
      app: new BrowserStorageAppRepo() as IAppRepository,
      assets: new BrowserStorageAssetsRepo() as IAssetsRepository,
      wallet: new BrowserStorageWalletRepo() as IWalletRepository,
    };
    store = mockThunkReducer(appReducer, appInitialState, repos);
  });

  afterEach(() => {
    store.setState(appInitialState);
    store.clearActions();
  });

  test('Should init wallet', () => {
    const initWalletAction = function () {
      return new Promise((resolve) => {
        store.dispatch(initWallet(testWalletProps));
        resolve(store.getState());
      });
    };

    return expect(initWalletAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletProps],
    });
  });

  test('Should create wallet', () => {
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [] });
    mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();

    const createWalletAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          createWallet(
            Password.create(password),
            Mnemonic.create(mnemonic),
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(createWalletAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletProps],
    });
  });

  test('Should restore wallet', () => {
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
    mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();

    const restoreWalletAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          restoreWallet(
            Password.create(password),
            Mnemonic.create(mnemonic),
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(restoreWalletAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletRestoredProps],
    });
  });

  test('Should derive new address', () => {
    // Create wallet
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletProps],
    });

    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
    mockBrowser.storage.local.set
      .expect({ wallets: [testWalletWithConfidentialAddrDTO] })
      .andResolve();

    const deriveNewAddressAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          deriveNewAddress(
            false,
            (confidentialAddress) => {
              resolve(store.getState());
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(deriveNewAddressAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletWithConfidentialAddrProps],
    });
  });

  test('Should derive a new address when one already exists', () => {
    // Create wallet with address
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletWithConfidentialAddrProps],
    });

    mockBrowser.storage.local.get
      .expect('wallets')
      .andResolve({ wallets: [testWalletWithConfidentialAddrDTO] });
    mockBrowser.storage.local.set
      .expect({ wallets: [testWalletWith2ConfidentialAddrDTO] })
      .andResolve();

    const deriveNewAddressAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          deriveNewAddress(
            false,
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(deriveNewAddressAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      wallets: [testWalletWith2ConfidentialAddrProps],
    });
  });
});
