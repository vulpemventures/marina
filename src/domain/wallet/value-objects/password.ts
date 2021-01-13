import { ValueObject } from '../../core/ValueObject';

interface PasswordProps {
  [key: string]: any;
  value: string;
}

export class Password extends ValueObject<PasswordProps> {
  public static minLength = 8;

  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: PasswordProps['value']) {
    super({ value: props });
  }

  private static isAppropriateLength(password: string): boolean {
    return password.length >= this.minLength;
  }

  public static create(password: PasswordProps['value']): Password {
    if (password === undefined || password === null || !this.isAppropriateLength(password)) {
      throw new Error('Password must be 8 chars min');
    } else {
      return new Password(password);
    }
  }
}
