import { TransactionDTO } from "../../domain/transaction";

export interface WalletDTO {
  confidentialAddresses: [address: string, derivationPath?: string][];
  encryptedMnemonic: string;
  masterXPub: string;
  masterBlindingKey: string;
  passwordHash: string;
  pendingTx?: TransactionDTO;
  utxoMap: string;
}
