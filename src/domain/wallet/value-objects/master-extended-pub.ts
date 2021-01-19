import { ValueObject } from '../../core/ValueObject';
import { isValidXpub, toXpub } from 'ldk';

interface MasterXPubProps {
  [key: string]: any;
  value: string;
}

export class MasterXPub extends ValueObject<MasterXPubProps> {
  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(masterXPub: MasterXPubProps['value']) {
    super({ value: masterXPub });
  }

  public static create(masterXPub: MasterXPubProps['value']): MasterXPub {
    if (isValidXpub(masterXPub) || isValidXpub(toXpub(masterXPub))) {
      return new MasterXPub(masterXPub);
    } else {
      throw new Error('MasterXPub is invalid');
    }
  }
}
