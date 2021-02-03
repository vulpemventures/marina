import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../reducers';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { flush, setAddressesAndAmount, setAsset, setFeeAssetAndAmount, setFeeChangeAddress } from './transaction';
import assets from '../../../../__test__/fixtures/assets.json';
import {
  transactionStateWithAsset,
  transactionStateWithReceipient,
  transactionStateWithFeeChangeAddress,
  transactionStateWithFees,
} from '../../../../__test__/fixtures/test-transaction';
import { confidentialAddresses } from '../../../../__test__/fixtures/wallet.json';
import { transactionInitState } from '../reducers/transaction-reducer';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Transaction Actions', () => {
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

  test('Should set asset of output to send', () => {
    store.dispatch(setAsset(assets[0].assetHash))
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
    });
  });

  test('Should set receipient address and amount', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
    });

    store.dispatch(setAddressesAndAmount(
      confidentialAddresses[0].value,
      confidentialAddresses[1].value,
      10000000,
    ))
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
    });
  });

  test('Should set fee change address', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
    });

    store.dispatch(setFeeChangeAddress(confidentialAddresses[1].value));
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
    })
  });

  test('Should set fee asset and amount', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
    });

    store.dispatch(setFeeAssetAndAmount(assets[1].assetHash, 138000));
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
    })
  });

  test('Should unset fees when setting receipient address and amount', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
    });

    store.dispatch(setAddressesAndAmount(
      confidentialAddresses[0].value,
      confidentialAddresses[1].value,
      10000000,
    ));
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
    })
  });

  test('Should unset fees and receipient address and amount when setting receipient asset', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
    });

    store.dispatch(setAsset(assets[0].assetHash));
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
    })
  });

  test('Should flush transaction', () => {
    store.setState({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
    });

    store.dispatch(flush());
    expect(store.getState()).toStrictEqual({
      wallets: [],
      app: testAppProps,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
    })
  });
});
