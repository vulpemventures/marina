import { browser } from 'webextension-polyfill-ts';
import { IWalletRepository } from '../../domain/wallet/i-wallet-repository';
import { Wallet } from '../../domain/wallet/wallet';
import { WalletMap } from '../../application/mappers/wallet-map';

export class WebExtStorageWalletRepo implements IWalletRepository {
  async exists(walletId: string): Promise<boolean> {
    const wallet = (await browser.storage.local.get('wallet')) as Wallet;
    const id = wallet.walletId.id.toValue();
    return id === walletId;
  }
  async getOrCreateWallet(): Promise<Wallet> {
    const wallet = (await browser.storage.local.get('wallet')) as Wallet;
    return WalletMap.toDomain(wallet);
  }
}
