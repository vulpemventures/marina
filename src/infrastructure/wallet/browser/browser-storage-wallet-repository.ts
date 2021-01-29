import { browser } from 'webextension-polyfill-ts';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { IWallet, Wallet } from '../../../domain/wallet/wallet';
import { WalletMap } from '../../../application/mappers/wallet-map';
import { WalletDTO } from '../../../application/dtos/wallet-dto';
import { Address } from '../../../domain/wallet/value-objects';
import { UtxoInterface } from 'ldk';

export class BrowserStorageWalletRepo implements IWalletRepository {
  async init(wallets: Wallet[]): Promise<void> {
    const ws = wallets.map((w: Wallet) => WalletMap.toDTO(w));
    await browser.storage.local.set({ wallets: ws });
  }

  async getOrCreateWallet(wallet?: IWallet): Promise<Wallet> {
    const store = (await browser.storage.local.get('wallets')) as { wallets: WalletDTO[] };

    // Create
    if (wallet !== undefined) {
      const w = Wallet.createWallet(wallet);
      const newStorageWallets: WalletDTO[] = [...store.wallets];
      // this check is only for testing purpose
      if (
        store.wallets.findIndex(
          (storeWallet) => storeWallet.walletId === w.walletId.id.toString()
        ) < 0
      ) {
        newStorageWallets.push(WalletMap.toDTO(w));
      }
      await browser.storage.local.set({ wallets: newStorageWallets });
      return w;
    }

    // Get the first wallet
    // Check if wallet exists in storage
    if (store.wallets === undefined || store.wallets.length <= 0) {
      throw new Error('wallet not found');
    }
    return WalletMap.toDomain(store.wallets[0]);
  }

  async addDerivedAddress(address: Address): Promise<void> {
    const wallet = await this.getOrCreateWallet();
    const isAlreadyDerived = wallet.confidentialAddresses
      .map(({ value }) => value)
      .includes(address.value);

    if (!isAlreadyDerived) {
      wallet.confidentialAddresses.push(address);
      await browser.storage.local.set({ wallets: [WalletMap.toDTO(wallet)] });
    }
  }

  async pushUtxo(utxo: UtxoInterface): Promise<void> {
    let newWallet: Wallet, newUtxos: UtxoInterface[];
    const currentWallet = await this.getOrCreateWallet();
    if (currentWallet.utxos) {
      newUtxos = [...currentWallet.utxos, utxo];
      newWallet = { ...currentWallet, utxos: newUtxos } as Wallet;
      await browser.storage.local.set({
        wallets: [WalletMap.toDTO(newWallet)],
      });
    }
  }

  // async deleteUtxo(utxo: UtxoInterface): Promise<void> {
  //   //JSON.stringify([...myMap])
  //   await browser.storage.local.set({ wallets: [WalletMap.toDTO(wallet)] });
  // }

  // async getAllUtxos(utxo: UtxoInterface): Promise<void> {
  //   //JSON.stringify([...myMap])
  //   await browser.storage.local.set({ wallets: [WalletMap.toDTO(wallet)] });
  // }
}
