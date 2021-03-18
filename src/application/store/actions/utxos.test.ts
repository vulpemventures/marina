import { UtxoInterface } from 'ldk';
import { compareUtxos, createWallet, setUtxos } from './index';
import { mint } from '../../../../test/_regtest';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import { appInitialState, appReducer } from '../reducers';
import { assetInitState } from '../reducers/asset-reducer';
import { txsHistoryInitState } from '../reducers/txs-history-reducer';
import { onboardingInitState } from '../reducers/onboarding-reducer';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { testWalletDTO, testWalletProps } from '../../../../test/fixtures/test-wallet';
import { testAppProps } from '../../../../test/fixtures/test-app';
import { mnemonic, password } from '../../../../test/fixtures/wallet.json';
import { getUtxoMap } from '../../../../test/fixtures/test-utxos';
import { getRandomWallet } from '../../../../test/fixtures/wallet-keys';
import { repos } from '../../../infrastructure';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Utxos Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;

  beforeAll(() => {
    store = mockThunkReducer(appReducer, appInitialState, repos);
  });

  afterEach(() => {
    store.setState(appInitialState);
    store.clearActions();
  });

  test('Should set utxos of 2 different key pairs', async () => {
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
      assets: assetInitState,
      onboarding: onboardingInitState,
      txsHistory: txsHistoryInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(3) }],
    });
  });

  test('Should not set utxos if same utxo set exists in store', async () => {
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
      assets: assetInitState,
      onboarding: onboardingInitState,
      txsHistory: txsHistoryInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(1) }],
    });
  });

  test('Should have utxo sets equal', () => {
    const utxoMapStore = new Map()
      .set('2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439:0', {
        txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439',
        vout: 0,
      })
      .set('7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8:1', {
        txid: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8',
        vout: 1,
      })
      .set('6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d:3', {
        txid: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d',
        vout: 3,
      });

    const fetchedUtxos = [
      { txid: '2de786058f73ff3d60a92c64c3c247b5599115d71a2f920e225646bc69f2f439', vout: 0 },
      { txid: '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d', vout: 3 },
      { txid: '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8', vout: 1 },
    ];

    return expect(compareUtxos(utxoMapStore, fetchedUtxos as UtxoInterface[])).toBeTruthy();
  });
});
