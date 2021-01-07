import { IWallet, Wallet } from './wallet';

export interface IWalletRepository {
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet>;
}
