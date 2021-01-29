import { Outpoint, UtxoInterface } from 'ldk';

export interface WalletDTO {
  walletId: string;
  masterXPub: string;
  masterBlindingKey: string;
  encryptedMnemonic: string;
  passwordHash: string;
  confidentialAddresses: string[];
  utxoMap: Map<Outpoint, UtxoInterface>;
}
