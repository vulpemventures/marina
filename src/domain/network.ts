export type Network = 'regtest' | 'liquid';

export function createNetwork(network: string): Network {
  if (network !== 'regtest' && network !== 'liquid') {
    throw new Error('Network must be either liquid or regtest');
  }
  return network;
}
