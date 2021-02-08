import { TransactionProps } from '../../domain/wallet/value-objects/transaction';
import { Outpoint, UtxoInterface } from 'ldk';

export interface WalletDTO {
  confidentialAddresses: string[];
  encryptedMnemonic: string;
  masterXPub: string;
  masterBlindingKey: string;
  passwordHash: string;
  pendingTx?: TransactionProps;
  utxoMap: Map<Outpoint, UtxoInterface>;
  walletId: string;
}
