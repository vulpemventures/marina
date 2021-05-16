import { changeNetwork, logIn, logOut, onboardingComplete, verifyWallet } from './app';
import { NetworkValue } from '../../../domain/app/value-objects';
import { repos } from '../../../infrastructure';
import { testWallet } from '../../../../test/fixtures/test-wallet';
import {
  testAppDTO,
  testAppProps,
  testAppAuthenticatedDTO,
  testAppAuthenticatedProps,
  testAppNetworkLiquidDTO,
  testAppNetworkLiquidProps,
  testAppOnboardedDTO,
  testAppOnboardedProps,
  testAppWalletVerifiedDTO,
  testAppWalletVerifiedProps,
} from '../../../../test/fixtures/test-app';

describe('App Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
    store = mockThunkReducer(appReducer, appInitialState, repos);
  });

  afterEach(() => {
    store.setState(appInitialState);
    store.clearActions();
  });

  test('Should init app', () => {
    const initAppAction = function () {
      return new Promise((resolve) => {
        store.dispatch(initApp(testAppProps));
        resolve(store.getState());
      });
    };

    return expect(initAppAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should update and persist wallet verification status', () => {
    // Repo update from testAppDTO to testAppWalletVerifiedDTO
    mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
    mockBrowser.storage.local.set.expect({ app: testAppWalletVerifiedDTO }).andResolve();

    const walletVerifyAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          verifyWallet(
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(walletVerifyAction()).resolves.toStrictEqual({
      app: testAppWalletVerifiedProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should update and persist onboarding status', () => {
    // Repo update from testAppDTO to testAppOnboardedDTO
    mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
    mockBrowser.storage.local.set.expect({ app: testAppOnboardedDTO }).andResolve();

    const onboardingCompleteAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          onboardingComplete(
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(onboardingCompleteAction()).resolves.toStrictEqual({
      app: testAppOnboardedProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should log in when valid password', () => {
    // Repo update from testAppDTO to testAppAuthenticatedDTO
    mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
    mockBrowser.storage.local.set.expect({ app: testAppAuthenticatedDTO }).andResolve();

    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWallet],
    });

    const logInAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          logIn(
            'testpassword',
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(logInAction()).resolves.toStrictEqual({
      app: testAppAuthenticatedProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWallet],
    });
  });

  test('Should not log in when invalid password', () => {
    store.setState({
      wallets: [testWallet],
      app: testAppProps,
    });

    const logInAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          logIn(
            'wrongpassword',
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(logInAction()).rejects.toEqual('Invalid password');
  });

  test('Should log out', () => {
    // Repo update from testAppAuthenticatedDTO to testAppDTO
    mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppAuthenticatedDTO });
    mockBrowser.storage.local.set.expect({ app: testAppDTO }).andResolve();

    const logOutAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          logOut(
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(logOutAction()).resolves.toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should change network', () => {
    // Repo update from regtest to liquid
    mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
    mockBrowser.storage.local.set.expect({ app: testAppNetworkLiquidDTO }).andResolve();

    const changeNetworkAction = function () {
      return new Promise((resolve, reject) => {
        return store.dispatch(
          changeNetwork(
            Network.create('liquid'),
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(changeNetworkAction()).resolves.toStrictEqual({
      app: testAppNetworkLiquidProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });
});
