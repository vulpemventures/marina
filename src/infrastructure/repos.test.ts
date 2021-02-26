import { App } from '../domain/app/app';
import { AssetsByNetwork } from '../domain/asset';
import {
  testApp,
  testAppDTO,
  testAppOnboarded,
  testAppOnboardedDTO,
} from '../../__test__/fixtures/test-app';
import {
  testAssets,
  testAssetsUpdated1,
  testAssetsUpdated2,
  testAssetsUpdated3,
} from '../../__test__/fixtures/test-assets';
import { testTxsHistory, testTxsHistoryUpdated1 } from '../../__test__/fixtures/test-txs-history';
import { testWallet, testWalletDTO, testWalletProps } from '../../__test__/fixtures/test-wallet';
import { assetInitState } from '../application/store/reducers/asset-reducer';
import { txsHistoryInitState } from '../application/store/reducers/txs-history-reducer';
import { TxsHistoryByNetwork } from '../domain/transaction';
import { repos } from './index';
import { BrowserStorageTxsHistoryRepo } from '../infrastructure/txs-history/browser-storage-txs-history-repository';

// Mock for UniqueEntityID
jest.mock('uuid');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v4 } = require('uuid');
// const serializeTxsHistory = (txsHistory: TxsHistory | string) => {
//   return typeof txsHistory !== 'string' ? JSON.stringify(txsHistory) : txsHistory;
// };
// const unserializeTxsHistory = (txsHistory: TxsHistory | string) => {
//   return typeof txsHistory === 'string' ? JSON.parse(txsHistory) : txsHistory;
// };

describe('Repositories', () => {
  beforeAll(() => {
    v4.mockImplementation(() => 'test-id');
  });

  describe('App repository', () => {
    test('Should init app', () => {
      // Call to set() will fail if it doesn't match invocation triggered by init()
      mockBrowser.storage.local.set.expect({ app: testAppOnboardedDTO }).andResolve();
      return expect(repos.app.init(testAppOnboarded)).resolves.toBeUndefined();
    });

    test('Should throw with app not found', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({});
      return expect(repos.app.getApp()).rejects.toThrow('app not found');
    });

    test('Should retrieve initialAppState from repo', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
      return expect(repos.app.getApp()).resolves.toStrictEqual(testApp);
    });

    test('Should update app state', () => {
      mockBrowser.storage.local.get.expect('app').andResolve({ app: testAppDTO });
      // Call to set() will fail if it doesn't match invocation triggered by updateApp()
      mockBrowser.storage.local.set.expect({ app: testAppOnboardedDTO }).andResolve();
      return expect(
        repos.app.updateApp(
          (app: App): App => {
            app.props.isOnboardingCompleted = true;
            return app;
          }
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('Wallet repository', () => {
    test('Should init wallet', () => {
      mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();
      return expect(repos.wallet.init([testWallet])).resolves.toBeUndefined();
    });

    test('Should not found wallet at initialState', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [] });
      return expect(repos.wallet.getOrCreateWallet()).rejects.toThrow('wallet not found');
    });

    test('Should retrieve wallet from repo', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({
        wallets: [testWalletDTO],
      });
      return expect(repos.wallet.getOrCreateWallet()).resolves.toStrictEqual(testWallet);
    });

    test('Should create a wallet', () => {
      mockBrowser.storage.local.get.expect('wallets').andResolve({ wallets: [testWalletDTO] });
      mockBrowser.storage.local.set.expect({ wallets: [testWalletDTO] }).andResolve();
      return expect(repos.wallet.getOrCreateWallet(testWalletProps)).resolves.toStrictEqual(
        testWallet
      );
    });
  });

  describe('Assets repository', () => {
    test('Should init assets', () => {
      // Call to set() will fail if it doesn't match invocation triggered by init()
      mockBrowser.storage.local.set.expect({ assets: testAssets }).andResolve();
      return expect(repos.assets.init(testAssets)).resolves.toBeUndefined();
    });

    test('Should retrieve assetInitState from repo', () => {
      mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssets });
      return expect(repos.assets.getAssets()).resolves.toStrictEqual(assetInitState);
    });

    test('Should update assets', () => {
      mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssets });
      // Call to set() will fail if it doesn't match invocation triggered by updateAssets()
      mockBrowser.storage.local.set.expect({ assets: testAssetsUpdated1 }).andResolve();
      return expect(
        repos.assets.updateAssets(
          (assets: AssetsByNetwork): AssetsByNetwork => {
            assets.regtest['60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb'] = {
              name: 'Random Shitcoin',
              ticker: 'SHIT',
              precision: 8,
            };
            return assets;
          }
        )
      ).resolves.toBeUndefined();
    });

    test('Should add regtest assets', async () => {
      // Set initial state
      mockBrowser.storage.local.set.expect({ assets: testAssets }).andResolve();
      await repos.assets.init(testAssets);
      // Add asset
      mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssets });
      mockBrowser.storage.local.set.expect({ assets: testAssetsUpdated1 }).andResolve();
      await expect(
        repos.assets.addAssets(testAssetsUpdated1.regtest, 'regtest')
      ).resolves.toBeUndefined();
      // Add another asset (expect testAssetsUpdated1 + testAssetsUpdated2)
      mockBrowser.storage.local.get.expect('assets').andResolve({ assets: testAssetsUpdated1 });
      mockBrowser.storage.local.set.expect({ assets: testAssetsUpdated3 }).andResolve();
      return expect(
        repos.assets.addAssets(testAssetsUpdated2.regtest, 'regtest')
      ).resolves.toBeUndefined();
    });
  });

  describe('Transaction history repository', () => {
    test('Should init txs history', () => {
      // Call to set() will fail if it doesn't match invocation triggered by init()
      mockBrowser.storage.local.set
        .expect({
          txsHistory: {
            regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistory.regtest),
            liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistory.liquid),
          },
        })
        .andResolve();
      return expect(repos.txsHistory.init(testTxsHistory)).resolves.toBeUndefined();
    });

    test('Should retrieve txsHistoryInitState from repo', () => {
      mockBrowser.storage.local.get.expect('txsHistory').andResolve({ txsHistory: testTxsHistory });
      return expect(repos.txsHistory.getTxsHistoryByNetwork()).resolves.toStrictEqual(
        txsHistoryInitState
      );
    });

    test('Should update txsHistory', () => {
      const regtestTxExpect = {
        txid: '60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb',
        fee: 4982,
        status: {
          confirmed: false,
          blockHeight: 20000,
          blockHash: '27a98d0e2770bc7b33d876493f94b0587bfd178a1d76f168fce27e5fd1294d8b',
          blockTime: 1614041616,
        },
        vin: [],
        vout: [],
      };
      mockBrowser.storage.local.get.expect('txsHistory').andResolve({ txsHistory: testTxsHistory });
      mockBrowser.storage.local.set
        .expect({
          txsHistory: {
            liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistoryUpdated1.liquid),
            regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory({
              [regtestTxExpect.txid]: regtestTxExpect,
            }),
          },
        })
        .andResolve();
      return expect(
        repos.txsHistory.updateTxsHistoryByNetwork(
          (txsHistory: TxsHistoryByNetwork): TxsHistoryByNetwork => {
            txsHistory.regtest[
              '60d4a99f2413d67ad58a66a6e0d108957208f66484c1208a8aacebac4fc148bb'
            ] = regtestTxExpect;
            return txsHistory;
          }
        )
      ).resolves.toBeUndefined();
    });

    test('Should add regtest txs history', async () => {
      // Set initial state
      mockBrowser.storage.local.set
        .expect({
          txsHistory: {
            regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistory.regtest),
            liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistory.liquid),
          },
        })
        .andResolve();
      await repos.txsHistory.init(testTxsHistory);
      // Add txs history
      mockBrowser.storage.local.get.expect('txsHistory').andResolve({ txsHistory: testTxsHistory });
      mockBrowser.storage.local.set
        .expect({
          txsHistory: {
            regtest: BrowserStorageTxsHistoryRepo.serializeTxsHistory(
              testTxsHistoryUpdated1.regtest
            ),
            liquid: BrowserStorageTxsHistoryRepo.serializeTxsHistory(testTxsHistoryUpdated1.liquid),
          },
        })
        .andResolve();
      return expect(
        repos.txsHistory.addTxsHistory(testTxsHistoryUpdated1.regtest, 'regtest')
      ).resolves.toBeUndefined();
    });
  });
});
