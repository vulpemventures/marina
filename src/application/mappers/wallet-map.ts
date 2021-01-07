import { Wallet } from '../../domain/wallet/wallet';
import { WalletDTO } from '../dtos/wallet-dto';
import { UniqueEntityID } from '../../domain/core/UniqueEntityID';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      walletId: wallet.walletId.id.toString(),
      masterXPub: wallet.masterXPub,
      masterBlindKey: wallet.masterBlindKey,
      encryptedMnemonic: wallet.encryptedMnemonic,
      passwordHash: wallet.passwordHash,
    };
  }

  public static toDomain(raw: WalletDTO): Wallet {
    const wallet = Wallet.createWallet(
      {
        masterXPub: raw.masterXPub,
        masterBlindKey: raw.masterBlindKey,
        encryptedMnemonic: raw.encryptedMnemonic,
        passwordHash: raw.passwordHash,
      },
      new UniqueEntityID(raw.walletId)
    );
    return wallet;
  }
}
