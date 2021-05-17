import { IdentityOpts, IdentityType, Mnemonic as MnemonicTdex } from 'ldk';

export class Mnemonic {
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: string) {
    this._value = props;
  }

  public static create(mnemo: string): Mnemonic {
    // Trim start-end and replace multiple spaces in between with a single space
    const mnemonic = mnemo.trim().replace(/ +(?= )/g, '');

    try {
      // Mnemonic validation, network doesn't matter
      new MnemonicTdex({ // TODO rename
        chain: 'liquid',
        type: IdentityType.Mnemonic,
        value: { mnemonic },
      } as IdentityOpts);
      return new Mnemonic(mnemonic);
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
