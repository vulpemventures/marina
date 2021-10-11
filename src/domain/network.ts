export type NetworkType = 'regtest' | 'liquid';

export function createNetwork(network: string): NetworkType {
  if (network !== 'regtest' && network !== 'liquid') {
    throw new Error('Network must be either liquid or regtest');
  }
  return network;
}
