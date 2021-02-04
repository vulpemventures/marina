import { UtxoInterface } from 'ldk';
import { compareUtxos, createWallet, fetchBalances, setUtxos } from './wallet';
import { mint } from '../../../../__test__/_regtest';
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

  test('Should set utxos of 2 different key pairs', async () => {
    jest.setTimeout(30000);
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
    // Set UTXOs
    mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
    mockBrowser.storage.local.set
      .expect({ wallets: [{ ...testWalletDTO, utxoMap: getUtxoMap(3) }] })
      .andResolve();
    // Mint 2 utxos on this key pair
    const keyPair1 = getRandomWallet();
    await mint(keyPair1.getNextAddress().confidentialAddress, 1);
    await mint(keyPair1.getNextAddress().confidentialAddress, 5678);
    // Mint 1 utxos on this key pair
    const keyPair2 = getRandomWallet();
    await mint(keyPair2.getNextAddress().confidentialAddress, 420);
    const setUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          setUtxos(
            [
              {
                confidentialAddress: keyPair1.getNextAddress().confidentialAddress,
                blindingPrivateKey: keyPair1.getNextAddress().blindingPrivateKey,
              },
              {
                confidentialAddress: keyPair2.getNextAddress().confidentialAddress,
                blindingPrivateKey: keyPair2.getNextAddress().blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    return expect(setUtxosAction()).resolves.toMatchObject({
      app: testAppProps,
      onboarding: onboardingInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(3) }],
    });
  });

  test('Should not set utxos if same utxo set exists in store', async () => {
    jest.setTimeout(20000);
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
    // Set UTXOs. Should be called once by first setUtxosAction()
    mockBrowser.storage.local.get
      .expect('wallets')
      .andResolve({ wallets: [testWalletDTO] })
      .times(1);
    mockBrowser.storage.local.set
      .expect({ wallets: [{ ...testWalletDTO, utxoMap: getUtxoMap(1) }] })
      .andResolve()
      .times(1);
    const keyPair = getRandomWallet();
    await mint(keyPair.getNextAddress().confidentialAddress, 5678);
    const setUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          setUtxos(
            [
              {
                confidentialAddress: keyPair.getNextAddress().confidentialAddress,
                blindingPrivateKey: keyPair.getNextAddress().blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    // Call setUtxosAction twice, second time should not update anything since utxo sets are equal
    await setUtxosAction();
    // TODO: Check that no calls to repo methods and dispatch/reducer have been made
    // In the meantime console.log shows that they are not called
    return expect(setUtxosAction()).resolves.toMatchObject({
      app: testAppProps,
      onboarding: onboardingInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(1) }],
    });
  });

  test('Should have utxo sets equal', () => {
    const utxoMapStore = new Map()
      .set(
        { txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439', vout: 0 },
        {
          txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439',
          vout: 0,
        }
      )
      .set(
        { txid: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8', vout: 1 },
        {
          txid: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
          vout: 1,
        }
      )
      .set(
        { txid: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d', vout: 3 },
        {
          txid: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
          vout: 3,
        }
      );

    const fetchedUtxos = [
      { txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439', vout: 0 },
      { txid: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d', vout: 3 },
      { txid: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8', vout: 1 },
    ];

    return expect(compareUtxos(utxoMapStore, fetchedUtxos as UtxoInterface[])).toBeTruthy();
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
        { '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8': 123000000 },
      ])
    );
  });
});
