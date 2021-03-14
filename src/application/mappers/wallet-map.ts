import { Outpoint, UtxoInterface } from 'ldk';
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
import { parse, stringify } from '../utils/browser-storage-converters';
import { toStringOutpoint } from '../utils';

export class WalletMap {
  public static toDTO(wallet: Wallet): WalletDTO {
    let pendingTx: any;
    if (wallet.pendingTx !== undefined && wallet.pendingTx.props.changeAddress) {
      pendingTx = { ...wallet.pendingTx.props };
      pendingTx.changeAddress = [
        wallet.pendingTx.props.changeAddress.value,
        wallet.pendingTx.props.changeAddress?.derivationPath,
      ] as [address: string, derivationPath?: string];
    } else {
      pendingTx = undefined;
    }

    return {
      confidentialAddresses: wallet.confidentialAddresses.map((a) => [a.value, a.derivationPath]),
      encryptedMnemonic: wallet.encryptedMnemonic.value,
      masterBlindingKey: wallet.masterBlindingKey.value,
      masterXPub: wallet.masterXPub.value,
      passwordHash: wallet.passwordHash.value,
      pendingTx: pendingTx as WalletDTO['pendingTx'],
      utxoMap: stringify(wallet.utxoMap),
      walletId: wallet.walletId.id.toString(),
    };
  }

  public static toDomain(raw: WalletDTO): Wallet {
    const utxos = parse(raw.utxoMap);
    const wallet = Wallet.createWallet(
      {
        confidentialAddresses: raw.confidentialAddresses.map(([address, derivationPath]) =>
          Address.create(address, derivationPath)
        ),
        encryptedMnemonic: EncryptedMnemonic.create(raw.encryptedMnemonic),
        masterBlindingKey: MasterBlindingKey.create(raw.masterBlindingKey),
        masterXPub: MasterXPub.create(raw.masterXPub),
        passwordHash: PasswordHash.create(raw.passwordHash),
        utxoMap:
          utxos.length > 0
            ? new Map(utxos.map((v: [Outpoint, UtxoInterface]) => [toStringOutpoint(v[1]), v[1]]))
            : new Map(),
      },
      new UniqueEntityID(raw.walletId)
    );
    if (raw.pendingTx) {
      const addr = Address.create(
        raw.pendingTx.changeAddress![0],
        raw.pendingTx.changeAddress?.[1]
      );
      wallet.props.pendingTx = Transaction.create({ ...raw.pendingTx, changeAddress: addr });
    }
    return wallet;
  }
}
