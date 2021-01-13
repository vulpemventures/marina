import { ValueObject } from '../../core/ValueObject';

interface PasswordHashProps {
  [key: string]: any;
  value: string;
}

export class PasswordHash extends ValueObject<PasswordHashProps> {
  get value(): string {
    return this.props.value;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: PasswordHashProps['value']) {
    super({ value: props });
  }

  public static create(passwordHash: PasswordHashProps['value']): PasswordHash {
    if (passwordHash === undefined || passwordHash === null || passwordHash.length !== 64) {
      throw new Error('PasswordHash must be 64 chars');
    } else {
      return new PasswordHash(passwordHash);
    }
  }
}
