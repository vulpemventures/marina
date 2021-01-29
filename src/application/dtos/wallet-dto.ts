import { UtxoInterface } from 'ldk';

export interface WalletDTO {
  walletId: string;
  masterXPub: string;
  masterBlindingKey: string;
  encryptedMnemonic: string;
  passwordHash: string;
  confidentialAddresses: string[];
  utxos: UtxoInterface[];
}
