import axios from 'axios';
import { AddressInterface } from 'ldk';
import { updateAllAssetInfos } from './assets';
import { updateUtxos } from './utxos';
import { createWallet } from './wallet';
import { mockThunkReducer } from '../reducers/mock-use-thunk-reducer';
import { repos } from '../../../infrastructure';
import { Mnemonic, Password } from '../../../domain/wallet/value-objects';
import { testWalletDTO, testWalletProps } from '../../../../test/fixtures/test-wallet';
import { getUtxoMap, testWalletUtxosProps } from '../../../../test/fixtures/test-utxos';
import { testAppProps } from '../../../../test/fixtures/test-app';
import { testAssets, testAssetsUpdated1 } from '../../../../test/fixtures/test-assets';
import { mnemonic, password } from '../../../../test/fixtures/wallet.json';
import { getRandomWallet } from '../../../../test/fixtures/wallet-keys';
import { mint } from '../../../../test/_regtest';

// Mock for UniqueEntityID
jest.mock('uuid');

describe('Assets Actions', () => {
  let store: ReturnType<typeof mockThunkReducer>;
  let confidentialAddress: AddressInterface['confidentialAddress'];

  beforeAll(() => {
    store = mockThunkReducer(appReducer, appInitialState, repos);
  });

  afterEach(() => {
    store.setState(appInitialState);
    store.clearActions();
  });

  test('Should get all asset balances', async () => {
    // Set wallet with 2 utxos in state
    store.setState({
      app: testAppProps,
      wallets: [testWalletUtxosProps],
    });

    const getAllAssetBalancesAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          getAllAssetBalances(
            (balances) => resolve(balances),
            (err: Error) => reject(err.message)
          )
        );
      });
    };

    return expect(getAllAssetBalancesAction()).resolves.toMatchObject({
      '7444b42c0c8be14d07a763ab0c1ca91cda0728b2d44775683a174bcdb98eecc8': 123000000,
      '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d': 42069420,
    });
  });

  test('Should get all asset infos', async () => {
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
    // Mint 2 tokens on keyPair1
    const keyPair1 = getRandomWallet();
    confidentialAddress = (await keyPair1.getNextAddress()).confidentialAddress;
    const mintData1 = await mint(confidentialAddress, 21000000, 'Vulpem', 'VLP');
    confidentialAddress = (await keyPair1.getNextAddress()).confidentialAddress;
    const mintData2 = await mint(confidentialAddress, 4200, 'Tether USD', 'USDt');
    // Mint 1 token on keyPair2
    const keyPair2 = getRandomWallet();
    confidentialAddress = (await keyPair2.getNextAddress()).confidentialAddress;
    const mintData3 = await mint(confidentialAddress, 100, 'Sticker pack', 'STIKR');
    const keyPair1Addr = await keyPair1.getNextAddress();
    const keyPair2Addr = await keyPair2.getNextAddress();
    const setUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateUtxos(
            [
              {
                confidentialAddress: keyPair1Addr.confidentialAddress,
                blindingPrivateKey: keyPair1Addr.blindingPrivateKey,
              },
              {
                confidentialAddress: keyPair2Addr.confidentialAddress,
                blindingPrivateKey: keyPair2Addr.blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    await setUtxosAction();
    // Get all assets infos
    const expectedAssets = {
      '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
        name: 'Liquid Bitcoin',
        precision: 8,
        ticker: 'L-BTC',
      },
      [mintData1.asset]: {
        name: 'Vulpem',
        precision: 8,
        ticker: 'VLP',
      },
      [mintData2.asset]: {
        name: 'Tether USD',
        precision: 8,
        ticker: 'USDt',
      },
      [mintData3.asset]: {
        name: 'Sticker pack',
        precision: 8,
        ticker: 'STIKR',
      },
    };
    mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssets });
    mockBrowser.storage.local.set
      .expect({
        assets: {
          liquid: testAssets.liquid,
          regtest: expectedAssets,
        },
      })
      .andResolve();
    const updateAllAssetInfosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateAllAssetInfos(
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    //
    return expect(updateAllAssetInfosAction()).resolves.toMatchObject({
      app: testAppProps,
      assets: {
        ...assetInitState,
        regtest: expectedAssets,
      },
      onboarding: onboardingInitState,
      txsHistory: txsHistoryInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(3) }],
    });
  });

  test('Should not fetch info from network if asset is in store', async () => {
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
      .expect({ wallets: [{ ...testWalletDTO, utxoMap: getUtxoMap(1) }] })
      .andResolve();
    // Mint 1 token
    const keyPair = getRandomWallet();
    confidentialAddress = (await keyPair.getNextAddress()).confidentialAddress;
    const mintData = await mint(confidentialAddress, 21000000, 'Random Shitcoin', 'SHIT', 8);
    // Set utxos in store using address/blindingPrivKey
    const keyPairAddr = await keyPair.getNextAddress();
    const setUtxosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateUtxos(
            [
              {
                confidentialAddress: keyPairAddr.confidentialAddress,
                blindingPrivateKey: keyPairAddr.blindingPrivateKey,
              },
            ],
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    await setUtxosAction();
    // Get all assets infos
    const expectedAssets = {
      '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
        name: 'Liquid Bitcoin',
        precision: 8,
        ticker: 'L-BTC',
      },
      [mintData.asset]: {
        name: 'Random Shitcoin',
        precision: 8,
        ticker: 'SHIT',
      },
    };
    mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssetsUpdated1 });
    mockBrowser.storage.local.set
      .expect({ assets: { ...assetInitState, regtest: expectedAssets } })
      .andResolve();
    const updateAllAssetInfosAction = function () {
      return new Promise((resolve, reject) => {
        store.dispatch(
          updateAllAssetInfos(
            () => resolve(store.getState()),
            (err: Error) => reject(err.message)
          )
        );
      });
    };
    // Call once to set infos in stores
    await updateAllAssetInfosAction();
    // Call a second time to test that it's not fetched again and stored again
    const spyAxios = jest.spyOn(axios, 'get');
    expect(spyAxios).not.toHaveBeenCalled();
    return expect(updateAllAssetInfosAction()).resolves.toMatchObject({
      app: testAppProps,
      assets: {
        ...assetInitState,
        regtest: expectedAssets,
      },
      onboarding: onboardingInitState,
      txsHistory: txsHistoryInitState,
      wallets: [{ ...testWalletProps, utxoMap: getUtxoMap(1) }],
    });
  });
});
