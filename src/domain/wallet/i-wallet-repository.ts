import { IWallet, Wallet } from './wallet';

export interface IWalletRepository {
  init(wallets: Wallet[]): Promise<void>;
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet>;
}
