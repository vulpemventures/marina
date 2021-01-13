import { ValueObject } from '../../core/ValueObject';

interface EncryptedMnemonicProps {
  [key: string]: any;
  value: string;
}

export class EncryptedMnemonic extends ValueObject<EncryptedMnemonicProps> {
  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: EncryptedMnemonicProps['value']) {
    super({ value: props });
  }

  public static create(encryptedMnemonic: EncryptedMnemonicProps['value']): EncryptedMnemonic {
    if (
      encryptedMnemonic === undefined ||
      encryptedMnemonic === null ||
      encryptedMnemonic.length !== 160
    ) {
      throw new Error('Encrypted mnemonic must be 160 chars');
    } else {
      return new EncryptedMnemonic(encryptedMnemonic);
    }
  }
}
