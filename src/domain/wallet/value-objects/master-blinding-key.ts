import { ValueObject } from '../../core/ValueObject';
import { isValidExtendedBlindKey } from 'ldk';

interface MasterBlindingKeyProps {
  [key: string]: any;
  value: string;
}

export class MasterBlindingKey extends ValueObject<MasterBlindingKeyProps> {
  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(masterBlindingKey: MasterBlindingKeyProps['value']) {
    super({ value: masterBlindingKey });
  }

  public static create(masterBlindingKey: MasterBlindingKeyProps['value']): MasterBlindingKey {
    if (isValidExtendedBlindKey(masterBlindingKey)) {
      return new MasterBlindingKey(masterBlindingKey);
    } else {
      throw new Error('MasterBlindingKey is invalid');
    }
  }
}
