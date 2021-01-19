import { ValueObject } from '../../core/ValueObject';
import { IdentityOpts, IdentityType, Mnemonic as MnemonicTdex } from 'ldk';

interface MnemonicProps {
  [key: string]: any;
  value: string;
}

export class Mnemonic extends ValueObject<MnemonicProps> {
  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: MnemonicProps['value']) {
    super({ value: props });
  }

  public static create(mnemo: MnemonicProps['value']): Mnemonic {
    // Trim start-end and replace multiple spaces in between with a single space
    const mnemonic = mnemo.trim().replace(/ +(?= )/g, '');

    try {
      new MnemonicTdex({
        chain: 'regtest',
        type: IdentityType.Mnemonic,
        value: { mnemonic },
      } as IdentityOpts);
      return new Mnemonic(mnemonic);
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
