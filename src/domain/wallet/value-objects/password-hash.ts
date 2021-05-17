export class PasswordHash {
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: string) {
    this._value = props;
  }

  public static create(passwordHash: string): PasswordHash {
    if (passwordHash === undefined || passwordHash === null || passwordHash.length !== 64) {
      throw new Error('PasswordHash must be 64 chars');
    } else {
      return new PasswordHash(passwordHash);
    }
  }
}
