import { TransactionDTO } from '../../domain/wallet/value-objects/transaction';

export interface WalletDTO {
  confidentialAddresses: [address: string, derivationPath?: string][];
  encryptedMnemonic: string;
  masterXPub: string;
  masterBlindingKey: string;
  passwordHash: string;
  pendingTx?: TransactionDTO;
  utxoMap: string;
  walletId: string;
}
