import { isValidXpub, toXpub } from 'ldk';

export class MasterXPub {
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(masterXPub: string) {
    this._value = masterXPub;
  }

  public static create(masterXPub: string): MasterXPub {
    if (isValidXpub(masterXPub) || isValidXpub(toXpub(masterXPub))) {
      return new MasterXPub(masterXPub);
    } else {
      throw new Error('MasterXPub is invalid');
    }
  }
}
