import { Wallet } from '../../domain/wallet/wallet';
import { WalletDTO } from '../dtos/wallet-dto';
import { UniqueEntityID } from '../../domain/core/UniqueEntityID';
import {
  PasswordHash,
  EncryptedMnemonic,
  MasterBlindingKey,
  MasterXPub,
} from '../../domain/wallet/value-objects';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      walletId: wallet.walletId.id.toString(),
      masterXPub: wallet.masterXPub.value,
      masterBlindingKey: wallet.masterBlindingKey.value,
      encryptedMnemonic: wallet.encryptedMnemonic.value,
      passwordHash: wallet.passwordHash.value,
    };
  }

  public static toDomain(raw: WalletDTO): Wallet {
    const wallet = Wallet.createWallet(
      {
        masterXPub: MasterXPub.create(raw.masterXPub),
        masterBlindingKey: MasterBlindingKey.create(raw.masterBlindingKey),
        encryptedMnemonic: EncryptedMnemonic.create(raw.encryptedMnemonic),
        passwordHash: PasswordHash.create(raw.passwordHash),
      },
      new UniqueEntityID(raw.walletId)
    );
    return wallet;
  }
}
