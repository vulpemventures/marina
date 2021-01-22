import { IAppRepository } from '../domain/app/i-app-repository';
import { IWalletRepository } from '../domain/wallet/i-wallet-repository';
import { App } from '../domain/app/app';
import { appInitState, walletInitState } from '../application/store/reducers';
import { IWallet, Wallet } from '../domain/wallet/wallet';

export async function initPersistentStore(repos: {
  app: IAppRepository;
  wallet: IWalletRepository;
}): Promise<void> {
  const app = App.createApp(appInitState);
  const wallets = walletInitState.map((w: IWallet) => Wallet.createWallet(w));
  await Promise.all([repos.app.init(app), repos.wallet.init(wallets)]);
}
