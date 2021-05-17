import { address as addressLDK } from 'ldk';

interface AddressProps {
  // Blinding Public Key
  blindingKey?: Buffer;
  derivationPath?: string;
  value: string;
  unconfidentialAddress?: string;
}

export class Address {
  private props: AddressProps;

  get value(): string {
    return this.props.value;
  }

  get blindingKey(): Buffer | undefined {
    return this.props.blindingKey;
  }

  get derivationPath(): string | undefined {
    return this.props.derivationPath;
  }

  get unconfidentialAddress(): string | undefined {
    return this.props.unconfidentialAddress;
  }

  // Can't use the `new` keyword from outside the scope of the class.
  private constructor(props: AddressProps) {
    this.props = {
      value: props.value,
      blindingKey: props.blindingKey,
      derivationPath: props.derivationPath,
      unconfidentialAddress: props.unconfidentialAddress,
    };
  }

  public static create(
    address: AddressProps['value'],
    derivationPath?: AddressProps['derivationPath']
  ): Address {
    try {
      // Non Confidential
      if (address.startsWith('ert') || address.startsWith('ex')) {
        addressLDK.fromBech32(address);
        return new Address({
          derivationPath: derivationPath,
          value: address,
        });
      } else {
        // Confidential
        const { blindingKey, unconfidentialAddress } = addressLDK.fromConfidential(address);
        return new Address({
          value: address,
          blindingKey: blindingKey,
          derivationPath: derivationPath,
          unconfidentialAddress: unconfidentialAddress,
        });
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
