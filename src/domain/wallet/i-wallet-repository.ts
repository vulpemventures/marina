import { Wallet } from './wallet';

export interface IWalletRepository {
  exists(userId: string): Promise<boolean>;
  get(): Promise<Wallet>;
  set(wallet: Wallet): Promise<void>;
}
