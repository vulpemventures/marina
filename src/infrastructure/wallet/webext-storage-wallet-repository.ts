import { browser } from 'webextension-polyfill-ts';
import { IWalletRepository } from '../../domain/wallet/i-wallet-repository';
import { IWallet, Wallet } from '../../domain/wallet/wallet';
import { WalletMap } from '../../application/mappers/wallet-map';
import { WalletDTO } from '../../application/dtos/wallet-dto';

export class WebExtStorageWalletRepo implements IWalletRepository {
  async getOrCreateWallet(wallet?: IWallet): Promise<Wallet> {
    const wallets = (await browser.storage.local.get('wallets')) as WalletDTO[];

    if (wallet !== undefined) {
      const w = Wallet.createWallet(wallet);
      wallets.push(WalletMap.toDTO(w));
      await browser.storage.local.set({ wallets });
      return w;
    }

    if (wallets.length <= 0) {
      throw new Error('wallet not found');
    }

    return WalletMap.toDomain(wallets[0]);
  }
}
