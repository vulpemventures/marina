export interface WalletDTO {
  walletId: string;
  masterXPub: string;
  masterBlindingKey: string;
  encryptedMnemonic: string;
  passwordHash: string;
  derivedAddresses: string[];
}
