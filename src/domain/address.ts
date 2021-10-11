import { address as addressLDK } from 'ldk';

export interface Address {
  // Blinding Public Key
  blindingKey?: Buffer;
  derivationPath?: string;
  value: string;
  unconfidentialAddress?: string;
}

export function createAddress(
  address: Address['value'],
  derivationPath?: Address['derivationPath']
): Address {
  if (addressLDK.isConfidential(address)) {
    const { blindingKey, unconfidentialAddress } = addressLDK.fromConfidential(address);
    return {
      value: address,
      blindingKey: blindingKey,
      derivationPath: derivationPath,
      unconfidentialAddress: unconfidentialAddress,
    };
  }

  return {
    derivationPath: derivationPath,
    value: address,
  };
}
