import { WalletDTO } from '../dtos/wallet-dto';

import { stringify } from '../utils/browser-storage-converters';
import { IWallet } from '../../domain/wallet';
// import { createWallet } from '../redux/actions/wallet';
// import { createAddress } from '../../domain/address';
// import { createEncryptedMnemonic } from '../../domain/encrypted-mnemonic';
// import { createMasterBlindingKey } from '../../domain/master-blinding-key';
// import { createMasterXPub } from '../../domain/master-extended-pub';
// import { createPasswordHash } from '../../domain/password-hash';

export class WalletMap {
  public static toDTO(wallet: IWallet): WalletDTO {
    let pendingTx: any;
    if (wallet.pendingTx !== undefined && wallet.pendingTx.changeAddress) {
      pendingTx = { ...wallet.pendingTx };
      pendingTx.changeAddress = [
        wallet.pendingTx.changeAddress?.value,
        wallet.pendingTx.changeAddress?.derivationPath,
      ] as [address: string, derivationPath?: string];
    } else {
      pendingTx = undefined;
    }

    return {
      confidentialAddresses: wallet.confidentialAddresses.map((a) => [a.value, a.derivationPath]),
      encryptedMnemonic: wallet.encryptedMnemonic,
      masterBlindingKey: wallet.masterBlindingKey,
      masterXPub: wallet.masterXPub,
      passwordHash: wallet.passwordHash,
      pendingTx: pendingTx as WalletDTO['pendingTx'],
      utxoMap: stringify(wallet.utxoMap),
    };
  }
}
//   public static toDomain(raw: WalletDTO): IWallet {
//     const utxos = parse(raw.utxoMap);
//     const wallet = createWallet(
//       {
//         confidentialAddresses: raw.confidentialAddresses.map(([address, derivationPath]) =>
//           createAddress(address, derivationPath)
//         ),
//         encryptedMnemonic: createEncryptedMnemonic(raw.encryptedMnemonic),
//         masterBlindingKey: createMasterBlindingKey(raw.masterBlindingKey),
//         masterXPub: createMasterXPub(raw.masterXPub),
//         passwordHash: createPasswordHash(raw.passwordHash),
//         utxoMap:
//           utxos.length > 0
//             ? new Map(utxos.map((v: [Outpoint, UtxoInterface]) => [toStringOutpoint(v[1]), v[1]]))
//             : {},
//       },
//     );
//     if (raw.pendingTx) {
//       const addr = Address.create(
//         raw.pendingTx.changeAddress![0],
//         raw.pendingTx.changeAddress?.[1]
//       );
//       wallet.props.pendingTx = Transaction.create({ ...raw.pendingTx, changeAddress: addr });
//     }
//     return wallet;
//   }
// }
