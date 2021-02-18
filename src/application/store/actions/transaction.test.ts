import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { IAssetsRepository } from '../../../domain/asset/i-assets-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { BrowserStorageAssetsRepo } from '../../../infrastructure/assets/browser-storage-assets-repository';
import { appInitialState, appReducer } from '../reducers';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import {
  flush,
  setAddressesAndAmount,
  setAsset,
  setFeeAssetAndAmount,
  setFeeChangeAddress,
} from './transaction';
import assets from '../../../../__test__/fixtures/assets.json';
import {
  transactionStateWithAsset,
  transactionStateWithReceipient,
  transactionStateWithFeeChangeAddress,
  transactionStateWithFees,
} from '../../../../__test__/fixtures/test-transaction';
import { confidentialAddresses } from '../../../../__test__/fixtures/wallet.json';
import { transactionInitState } from '../reducers/transaction-reducer';
import { assetInitState } from '../reducers/asset-reducer';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Transaction Actions', () => {
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

  test('Should set asset of output to send', () => {
    store.dispatch(setAsset(assets[0].assetHash));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
      wallets: [],
    });
  });

  test('Should set receipient address and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
      wallets: [],
    });

    store.dispatch(
      setAddressesAndAmount(
        confidentialAddresses[0].address,
        confidentialAddresses[1].address,
        10000000
      )
    );
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      wallets: [],
    });
  });

  test('Should set fee change address', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      wallets: [],
    });

    store.dispatch(setFeeChangeAddress(confidentialAddresses[1].address));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
      wallets: [],
    });
  });

  test('Should set fee asset and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
      wallets: [],
    });

    store.dispatch(setFeeAssetAndAmount(assets[1].assetHash, 138000));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      wallets: [],
    });
  });

  test('Should unset fees when setting receipient address and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      wallets: [],
    });

    store.dispatch(
      setAddressesAndAmount(
        confidentialAddresses[0].address,
        confidentialAddresses[1].address,
        10000000
      )
    );
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      wallets: [],
    });
  });

  test('Should unset fees and receipient address and amount when setting receipient asset', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      wallets: [],
    });

    store.dispatch(setAsset(assets[0].assetHash));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
      wallets: [],
    });
  });

  test('Should flush transaction', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      wallets: [],
    });

    store.dispatch(flush());
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      wallets: [],
    });
  });
});
