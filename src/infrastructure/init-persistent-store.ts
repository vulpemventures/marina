import { App } from '../domain/app/app';
import { IWallet, Wallet } from '../domain/wallet/wallet';
import { Repositories } from '../domain/common';

const connectInitState = {
  regtest: { enableSitePending: '', enabledSites: [] },
  liquid: { enableSitePending: '', enabledSites: [] },
};

/**
 * Init browser storage at extension installation
 * @param repos
 */
export async function initPersistentStore(repos: Repositories): Promise<void> {
  const app = App.createApp(appInitState);
  const wallets = walletInitState.map((w: IWallet) => Wallet.createWallet(w));
  await Promise.all([
    repos.app.init(app),
    repos.assets.init(assetInitState),
    repos.connect.init(connectInitState),
    repos.txsHistory.init({ regtest: {}, liquid: {} }),
    repos.wallet.init(wallets),
  ]);
}
