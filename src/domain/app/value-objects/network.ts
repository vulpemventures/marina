import { ValueObject } from '../../core/ValueObject';

interface NetworkProps {
  [key: string]: any;
  value: string;
}

export class Network extends ValueObject<NetworkProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(network: Network['value']) {
    super({ value: network });
  }

  public static create(network: Network['value']): Network {
    if (network !== 'regtest' && network !== 'liquid') {
      throw new Error('Network must be either liquid or regtest');
    }
    return new Network(network);
  }
}
