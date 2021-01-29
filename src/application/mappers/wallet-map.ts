import { Wallet } from '../../domain/wallet/wallet';
import { WalletDTO } from '../dtos/wallet-dto';
import { UniqueEntityID } from '../../domain/core/UniqueEntityID';
import {
  Address,
  PasswordHash,
  EncryptedMnemonic,
  MasterBlindingKey,
  MasterXPub,
} from '../../domain/wallet/value-objects';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      confidentialAddresses: wallet.confidentialAddresses.map((d) => d.value),
      encryptedMnemonic: wallet.encryptedMnemonic.value,
      masterBlindingKey: wallet.masterBlindingKey.value,
      masterXPub: wallet.masterXPub.value,
      passwordHash: wallet.passwordHash.value,
      utxos: wallet.utxos,
      walletId: wallet.walletId.id.toString(),
    };
  }

  public static toDomain(raw: WalletDTO): Wallet {
    const wallet = Wallet.createWallet(
      {
        confidentialAddresses: raw.confidentialAddresses.map((addr) => Address.create(addr)),
        encryptedMnemonic: EncryptedMnemonic.create(raw.encryptedMnemonic),
        masterBlindingKey: MasterBlindingKey.create(raw.masterBlindingKey),
        masterXPub: MasterXPub.create(raw.masterXPub),
        passwordHash: PasswordHash.create(raw.passwordHash),
        utxos: raw.utxos,
      },
      new UniqueEntityID(raw.walletId)
    );
    return wallet;
  }
}
