import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';
import { IWallet, Wallet } from '../../../domain/wallet/wallet';
import { WalletMap } from '../../../application/mappers/wallet-map';
import { WalletDTO } from '../../../application/dtos/wallet-dto';

interface WalletStorage {
  wallets: WalletDTO[];
}

const storage: WalletStorage = { wallets: [] };

export class MemoryStorageWalletRepo implements IWalletRepository {
  getOrCreateWallet(wallet?: IWallet): Promise<Wallet> {
    if (wallet !== undefined) {
      const w = Wallet.createWallet(wallet);
      storage.wallets.push(WalletMap.toDTO(w));
      return Promise.resolve(w);
    }

    if (storage.wallets.length <= 0) {
      throw new Error('wallet not found');
    }

    return Promise.resolve(WalletMap.toDomain(storage.wallets[0]));
  }
}
