export type NetworkValue = 'regtest' | 'liquid'

export class Network {
  value: NetworkValue = 'liquid';

  private constructor(network: NetworkValue) {
    this.value = network;
  }

  public static create(network: string): Network {
    if (network !== 'regtest' && network !== 'liquid') {
      throw new Error('Network must be either liquid or regtest');
    }
    return new Network(network);
  }
}
