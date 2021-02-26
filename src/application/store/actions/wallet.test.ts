import {
  createWallet,
  deriveNewAddress,
  initWallet,
  restoreWallet,
  setPendingTx,
  unsetPendingTx,
} from './wallet';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import { Transaction } from '../../../domain/wallet/value-objects/transaction';
import { appInitialState, appReducer } from '../reducers';
import { assetInitState } from '../reducers/asset-reducer';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { transactionInitState } from '../reducers/transaction-reducer';
import { txsHistoryInitState } from '../reducers/txs-history-reducer';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import {
  testWalletDTO,
  testWalletProps,
  testWalletRestoredProps,
  testWalletWith2ConfidentialAddrDTO,
  testWalletWith2ConfidentialAddrProps,
  testWalletWithConfidentialAddrDTO,
  testWalletWithConfidentialAddrProps,
  testWalletWithPendingTxDTO,
  testWalletWithPendingTxProps,
} from '../../../../__test__/fixtures/test-wallet';
import { mnemonic, password, pendingTx } from '../../../../__test__/fixtures/wallet.json';
import {
  mnemonic as mnemonicRestore,
  password as passwordRestore,
} from '../../../../__test__/fixtures/restore-wallet.json';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { repos } from '../../../infrastructure';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Wallet Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
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
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
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
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
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
            Password.create(passwordRestore),
            Mnemonic.create(mnemonicRestore),
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
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletRestoredProps],
    });
  });

  test('Should derive new address', () => {
    // Create wallet
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
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
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletWithConfidentialAddrProps],
    });
  });

  test('Should derive a new address when one already exists', () => {
    // Create wallet with address
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
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
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletWith2ConfidentialAddrProps],
    });
  });

  test('Should set a pending tx', () => {
    // Create wallet with address
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletProps],
    });

    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
    mockBrowser.storage.local.set.expect({ wallets: [testWalletWithPendingTxDTO] }).andResolve();

    const setPendingTxAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          setPendingTx(
            Transaction.create(pendingTx),
            () => {
              resolve(store.getState());
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(setPendingTxAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletWithPendingTxProps],
    });
  });

  test('Should unset an already set pending tx', () => {
    // Create wallet with address
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletWithPendingTxProps],
    });

    mockBrowser.storage.local.get
      .expect('wallets')
      .andResolve({ wallets: [testWalletWithPendingTxDTO] });
    mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();

    const unsetPendingTxAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          unsetPendingTx(
            () => {
              resolve(store.getState());
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(unsetPendingTxAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletProps],
    });
  });
});
