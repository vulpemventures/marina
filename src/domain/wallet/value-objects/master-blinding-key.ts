import { isValidExtendedBlindKey } from 'ldk';

export class MasterBlindingKey {
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(masterBlindingKey: string) {
    this._value = masterBlindingKey;
  }

  public static create(masterBlindingKey: string): MasterBlindingKey {
    if (isValidExtendedBlindKey(masterBlindingKey)) {
      return new MasterBlindingKey(masterBlindingKey);
    } else {
      throw new Error('MasterBlindingKey is invalid');
    }
  }
}
