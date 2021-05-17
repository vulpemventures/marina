export class Password {
  public static MIN_LENGTH = 8;
  private _value: string;

  get value(): string {
    return this._value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: string) {
    this._value = props;
  }

  private static isAppropriateLength(password: string): boolean {
    return password.length >= Password.MIN_LENGTH;
  }

  public static create(password: string): Password {
    console.log(password);
    if (password === undefined || password === null || !Password.isAppropriateLength(password)) {
      throw new Error('Password must be 8 chars min');
    } else {
      return new Password(password);
    }
  }
}
