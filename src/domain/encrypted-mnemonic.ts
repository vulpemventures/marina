export type EncryptedMnemonic = string;

export function createEncryptedMnemonic(encryptedMnemonic: string): EncryptedMnemonic {
  if (encryptedMnemonic === undefined || encryptedMnemonic === null)
    throw new Error('Encrypted mnemonic must be defined');
  return encryptedMnemonic;
}
