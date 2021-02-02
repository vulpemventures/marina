import { TransactionProps } from '../../domain/wallet/value-objects/transaction';

export interface WalletDTO {
  walletId: string;
  masterXPub: string;
  masterBlindingKey: string;
  encryptedMnemonic: string;
  passwordHash: string;
  confidentialAddresses: string[];
  pendingTx?: TransactionProps;
}
