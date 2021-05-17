export type EncryptedMnemonic = string;

export function createEncryptedMnemonic(encryptedMnemonic: string): EncryptedMnemonic {
  if (
    encryptedMnemonic === undefined ||
    encryptedMnemonic === null ||
    !(encryptedMnemonic.length >= 160 && encryptedMnemonic.length <= 192)
  ) {
    throw new Error('Encrypted mnemonic must be between 160 between and 192 chars');
  } else {
    return encryptedMnemonic
  }
}
