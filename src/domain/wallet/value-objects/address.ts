import { ValueObject } from '../../core/ValueObject';
import { address as addressLDK } from 'ldk';

interface AddressProps {
  [key: string]: any;
  blindingKey?: Buffer;
  value: string;
  unconfidentialAddress?: string;
}

export class Address extends ValueObject<AddressProps> {
  get value(): string {
    return this.props.value;
  }

  get blindingKey(): Buffer | undefined {
    return this.props.blindingKey;
  }

  get unconfidentialAddress(): string | undefined {
    return this.props.unconfidentialAddress;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: AddressProps) {
    super({
      value: props.value,
      blindingKey: props.blindingKey,
      unconfidentialAddress: props.unconfidentialAddress,
    });
  }

  public static create(address: AddressProps['value']): Address {
    try {
      // Non Confidential
      if (address.startsWith('ert') || address.startsWith('ex')) {
        addressLDK.fromBech32(address);
        return new Address({
          value: address,
        });
      } else {
        // Confidential
        const { blindingKey, unconfidentialAddress } = addressLDK.fromConfidential(address);
        return new Address({
          value: address,
          blindingKey: blindingKey,
          unconfidentialAddress: unconfidentialAddress,
        });
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
