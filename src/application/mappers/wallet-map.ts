import { Wallet } from '../../domain/wallet/wallet';
import { WalletDTO } from '../dtos/wallet-dto';
import { UniqueEntityID } from '../../domain/core/UniqueEntityID';
import { WalletId } from '../../domain/wallet/walletId';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      mnemonic: wallet.mnemonic,
    };
  }

  public static toDomain(raw: { mnemonic: string; walletId: WalletId }): Wallet {
    const wallet = Wallet.createWallet(
      {
        mnemonic: raw.mnemonic,
      },
      new UniqueEntityID(raw.walletId.id.toString())
    );
    return wallet;
  }

  public static toPersistence({ mnemonic, walletId }: Wallet) {
    return {
      mnemonic: mnemonic,
      walletId: walletId.id.toString(),
    };
  }
}
