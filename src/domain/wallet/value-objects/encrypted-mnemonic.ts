export class EncryptedMnemonic {
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(value: string) {
    this._value = value;
  }

  public static create(encryptedMnemonic: string): EncryptedMnemonic {
    if (
      encryptedMnemonic === undefined ||
      encryptedMnemonic === null ||
      !(encryptedMnemonic.length >= 160 && encryptedMnemonic.length <= 192)
    ) {
      throw new Error('Encrypted mnemonic must be between 160 between and 192 chars');
    } else {
      return new EncryptedMnemonic(encryptedMnemonic);
    }
  }
}
