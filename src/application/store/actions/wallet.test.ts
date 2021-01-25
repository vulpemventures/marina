import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../reducers';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import {
  testWalletDTO,
  testWalletProps,
  testWalletRestoredProps,
  testWalletWithConfidentialAddrDTO,
  testWalletWithConfidentialAddrProps,
} from '../../../../__test__/fixtures/test-wallet';
import { createWallet, deriveNewAddress, initWallet, restoreWallet } from './wallet';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { password, mnemonic } from '../../../../__test__/fixtures/wallet.json';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Wallet Actions', () => {
  let repos, store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
    repos = {
      app: new BrowserStorageAppRepo() as IAppRepository,
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
      wallets: [testWalletProps],
      app: testAppProps,
    });
  });

  test('Should create wallet', () => {
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
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
      wallets: [testWalletProps],
      app: testAppProps,
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
      wallets: [testWalletRestoredProps],
      app: testAppProps,
    });
  });

  test('Should derive new address', () => {
    // Create wallet
    store.setState({
      wallets: [testWalletProps],
      app: testAppProps,
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
      wallets: [testWalletWithConfidentialAddrProps],
      app: testAppProps,
    });
  });
});
