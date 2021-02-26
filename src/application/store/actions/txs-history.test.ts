import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { appInitialState, appReducer } from '../reducers';
import { repos } from '../../../infrastructure';
import { updateTxsHistory } from './txs-history';
import { faucet } from '../../../../__test__/_regtest';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { assetInitState } from '../reducers/asset-reducer';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { txsHistoryInitState } from '../reducers/txs-history-reducer';
import {
  testWalletDTO,
  testWalletProps,
  testWalletWithConfidentialAddrDTO,
} from '../../../../__test__/fixtures/test-wallet';
import { deriveNewAddress } from './wallet';
import { confidentialAddresses } from '../../../../__test__/fixtures/wallet.json';
import { transactionInitState } from '../reducers/transaction-reducer';
import { testTx, testTxsHistory } from '../../../../__test__/fixtures/test-txs-history';
import { IAppState } from '../../../domain/common';

jest.mock('uuid');

describe('Transaction History Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
    store = mockThunkReducer(appReducer, appInitialState, repos);
  });

  afterEach(() => {
    store.setState(appInitialState);
    store.clearActions();
  });

  test('Should add a single transaction to transactions history', async () => {
    jest.setTimeout(20000);
    // Create wallet
    store.setState({
      app: testAppProps,
      assets: assetInitState,
      onboarding: onboardingInitState,
      transaction: transactionInitState,
      txsHistory: txsHistoryInitState,
      wallets: [testWalletProps],
    });
    // Derive first address
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
    await deriveNewAddressAction();
    // Broadcast tx
    mockBrowser.storage.local.get.expect('txsHistory').andResolve({ txsHistory: testTxsHistory });
    // TODO: Find out how to test object with dynamic keys
    // regtest: { [expect.any(String)]: testTx }
    mockBrowser.storage.local.set.expect({ txsHistory: expect.anything() }).andResolve();
    const txid = await faucet(confidentialAddresses[0].address, 99);
    const updateTxsAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateTxsHistory(
            () => {
              const { txsHistory } = store.getState() as IAppState;
              resolve(txsHistory.regtest[txid]);
            },
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    return expect(updateTxsAction()).resolves.toStrictEqual(testTx);
  });
});
