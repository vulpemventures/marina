import { browser } from 'webextension-polyfill-ts';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { IWallet, Wallet } from '../../../domain/wallet/wallet';
import { WalletMap } from '../../../application/mappers/wallet-map';
import { WalletDTO } from '../../../application/dtos/wallet-dto';
import { Address } from '../../../domain/wallet/value-objects';

export class BrowserStorageWalletRepo implements IWalletRepository {
  async init(wallets: Wallet[]): Promise<void> {
    const ws = wallets.map((w: Wallet) => WalletMap.toDTO(w));
    await browser.storage.local.set({ wallets: ws });
  }

  async getOrCreateWallet(wallet?: IWallet): Promise<Wallet> {
    const store = await browser.storage.local.get('wallets');

    if (wallet !== undefined) {
      let wallets: WalletDTO[] = [];
      if (store && store.wallets !== undefined) {
        wallets = store.wallets;
      }
      const w = Wallet.createWallet(wallet);
      wallets.push(WalletMap.toDTO(w));
      await browser.storage.local.set({ wallets });
      return w;
    }

    if (store.wallets === undefined || store.wallets.length <= 0) {
      throw new Error('wallet not found');
    }

    return WalletMap.toDomain(store.wallets[0]);
  }

  async addDerivedAddress(address: Address): Promise<void> {
    const wallet = await this.getOrCreateWallet();
    const isAlreadyDerived = wallet.derivedAddresses.find(
      ({value}) => value === address.value
    ) !== undefined;
    
    if (!isAlreadyDerived) {
      wallet.derivedAddresses.push(address);
      await browser.storage.local.set({ wallets: [ WalletMap.toDTO(wallet) ] });
    }
  }
}
