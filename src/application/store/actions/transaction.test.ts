import { fetchBalances, updateUtxos } from './wallet';
import { mint, sleep } from '../../../../__test__/_regtest';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../reducers';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testWalletProps } from '../../../../__test__/fixtures/test-wallet';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { utxo } from '../../../../__test__/fixtures/test-transaction';
import { getRandomWallet } from '../../../../__test__/fixtures/wallet-keys';

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

  test('Should update utxos', async () => {
    jest.setTimeout(20000);
    // Set basic wallet in state
    store.setState({
      wallets: [testWalletProps],
      app: testAppProps,
    });

    const wallet = getRandomWallet();
    await mint(wallet.getNextAddress().confidentialAddress, 1);
    await sleep(2000);
    await mint(wallet.getNextAddress().confidentialAddress, 5678);
    await sleep(2000);

    const updateUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateUtxos(
            [
              {
                confidentialAddress: wallet.getNextAddress().confidentialAddress,
                blindingPrivateKey: wallet.getNextAddress().blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(updateUtxosAction()).resolves.toMatchObject({
      app: testAppProps,
      onboarding: undefined,
      wallets: [{ ...testWalletProps, utxos: [utxo, utxo] }],
    });
  });

  test('Should fetch balances', async () => {
    //jest.setTimeout(10000);

    // mockBrowser.storage.local.get
    //   .expect('wallets')
    //   .andResolve({ wallets: [testWalletWithConfidentialAddrDTO] });
    // mockBrowser.storage.local.set
    //   .expect({ wallets: [testWalletWith2ConfidentialAddrDTO] })
    //   .andResolve();

    // Set basic wallet in state
    store.setState({
      wallets: [testWalletProps],
      app: testAppProps,
    });

    const wallet = getRandomWallet();
    await mint(wallet.getNextAddress().confidentialAddress, 1);
    await sleep(2000);

    const updateUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateUtxos(
            [
              {
                confidentialAddress: wallet.getNextAddress().confidentialAddress,
                blindingPrivateKey: wallet.getNextAddress().blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    const fetchBalancesAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          fetchBalances(
            (balances) => resolve(balances),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(updateUtxosAction().then(fetchBalancesAction)).resolves.toMatchObject(
      expect.arrayContaining([[expect.any(String), 100000000]])
    );
  });
});
