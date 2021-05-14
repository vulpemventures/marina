import { repos } from '../../../infrastructure';
import { appInitialState, appReducer } from '../reducers';
import { assetInitState } from '../reducers/asset-reducer';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { transactionInitState } from '../reducers/transaction-reducer';
import { txsHistoryInitState } from '../reducers/txs-history-reducer';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testAppProps } from '../../../../test/fixtures/test-app';
import {
  flush,
  setAddressesAndAmount,
  setAsset,
  setFeeAssetAndAmount,
  setFeeChangeAddress,
} from './transaction';
import assets from '../../../../test/fixtures/assets.json';
import {
  transactionStateWithAsset,
  transactionStateWithReceipient,
  transactionStateWithFeeChangeAddress,
  transactionStateWithFees,
} from '../../../../test/fixtures/test-transaction';
import { confidentialAddresses } from '../../../../test/fixtures/wallet.json';
import { Address } from '../../../domain/wallet/value-objects';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Transaction Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
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
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should set receipient address and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(
      setAddressesAndAmount(
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
        10000000
      )
    );
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should set fee change address', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(
      setFeeChangeAddress(
        Address.create(confidentialAddresses[1].address, confidentialAddresses[1].derivationPath)
      )
    );
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should set fee asset and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFeeChangeAddress,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(setFeeAssetAndAmount(assets[1].assetHash, 138000));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should unset fees when setting receipient address and amount', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(
      setAddressesAndAmount(
        Address.create(confidentialAddresses[0].address),
        Address.create(confidentialAddresses[1].address),
        10000000
      )
    );
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithReceipient,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should unset fees and receipient address and amount when setting receipient asset', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(setAsset(assets[0].assetHash));
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithAsset,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });

  test('Should flush transaction', () => {
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionStateWithFees,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });

    store.dispatch(flush());
    expect(store.getState()).toStrictEqual({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [],
    });
  });
});
