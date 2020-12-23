import { Wallet } from '../../domain/wallet/wallet';
import { WalletDTO } from '../dtos/wallet-dto';
import { UniqueEntityID } from '../../domain/core/UniqueEntityID';
import { WalletId } from '../../domain/wallet/walletId';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      entropy: wallet.entropy,
      mnemonic: wallet.mnemonic,
    };
  }

  public static toDomain(raw: { entropy: string; mnemonic: string[]; walletId: WalletId }): Wallet {
    const wallet = Wallet.createWallet(
      {
        entropy: raw.entropy,
        mnemonic: raw.mnemonic,
      },
      new UniqueEntityID(raw.walletId.id.toString())
    );
    return wallet;
  }

  public static toPersistence({ entropy, mnemonic, walletId }: Wallet) {
    return {
      entropy: entropy,
      mnemonic: mnemonic,
      walletId: walletId.id.toString(),
    };
  }
}
