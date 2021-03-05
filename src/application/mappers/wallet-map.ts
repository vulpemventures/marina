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
import { Transaction } from '../../domain/wallet/value-objects/transaction';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    return {
      confidentialAddresses: wallet.confidentialAddresses.map((a) => [a.value, a.derivationPath]),
      encryptedMnemonic: wallet.encryptedMnemonic.value,
      masterBlindingKey: wallet.masterBlindingKey.value,
      masterXPub: wallet.masterXPub.value,
      passwordHash: wallet.passwordHash.value,
      pendingTx: wallet.pendingTx?.props,
      utxoMap: wallet.utxoMap,
      walletId: wallet.walletId.id.toString(),
    };
  }

  public static toDomain(raw: WalletDTO): Wallet {
    const wallet = Wallet.createWallet(
      {
        confidentialAddresses: raw.confidentialAddresses.map(([address, derivationPath]) =>
          Address.create(address, derivationPath)
        ),
        encryptedMnemonic: EncryptedMnemonic.create(raw.encryptedMnemonic),
        masterBlindingKey: MasterBlindingKey.create(raw.masterBlindingKey),
        masterXPub: MasterXPub.create(raw.masterXPub),
        passwordHash: PasswordHash.create(raw.passwordHash),
        utxoMap: raw.utxoMap,
      },
      new UniqueEntityID(raw.walletId)
    );
    if (raw.pendingTx) {
      wallet.props.pendingTx = Transaction.create(raw.pendingTx);
    }
    return wallet;
  }
}
