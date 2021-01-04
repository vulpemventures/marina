import { Wallet } from './wallet';

export interface IWalletRepository {
  exists(walletId: string): Promise<boolean>;
  getOrCreateWallet({
    mnemonic,
    passphrase,
  }?: Record<'mnemonic' | 'passphrase', string>): Promise<Wallet>;
}
