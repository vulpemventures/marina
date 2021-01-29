import { createWallet, fetchBalances, updateUtxos } from './wallet';
import { mint, sleep } from '../../../../__test__/_regtest';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { BrowserStorageAppRepo } from '../../../infrastructure/app/browser/browser-storage-app-repository';
import { BrowserStorageWalletRepo } from '../../../infrastructure/wallet/browser/browser-storage-wallet-repository';
import { appInitialState, appReducer } from '../reducers';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testWalletDTO, testWalletProps } from '../../../../__test__/fixtures/test-wallet';
import { testAppProps } from '../../../../__test__/fixtures/test-app';
import { mnemonic, password } from '../../../../__test__/fixtures/wallet.json';
import { getUtxoMap, testWalletUtxosProps } from '../../../../__test__/fixtures/test-transaction';
import { getRandomWallet } from '../../../../__test__/fixtures/wallet-keys';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import { onboardingInitState } from '../reducers/onboarding-reducer';

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
    jest.setTimeout(15000);

    // Create basic wallet in React state and browser storage
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [] });
    mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();
    store.dispatch(
      createWallet(
        Password.create(password),
        Mnemonic.create(mnemonic),
        () => true,
        (err) => console.log(err)
      )
    );

    // Update UTXOs
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
    mockBrowser.storage.local.set
      .expect({ wallets: [{ ...testWalletDTO, utxoMap: getUtxoMap(2) }] })
      .andResolve();

    const wallet = getRandomWallet();
    await mint(wallet.getNextAddress().confidentialAddress, 1);
    await sleep(1000);
    await mint(wallet.getNextAddress().confidentialAddress, 5678);
    await sleep(1000);

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
      onboarding: onboardingInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(2) }],
    });
  });

  test('Should fetch balances', async () => {
    // Set wallet with 1 utxo in state
    store.setState({
      app: testAppProps,
      wallets: [testWalletUtxosProps],
    });

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

    return expect(fetchBalancesAction()).resolves.toMatchObject(
      expect.arrayContaining([
        ['7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8', 123000000],
      ])
    );
  });
});
