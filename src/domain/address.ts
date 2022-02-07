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
  try {
    // confidential address
    const { blindingKey, unconfidentialAddress } = addressLDK.fromConfidential(address);
    return {
      value: address,
      blindingKey: blindingKey,
      derivationPath: derivationPath,
      unconfidentialAddress: unconfidentialAddress,
    };
  } catch (ignore) {
    // unconfidential address
    addressLDK.fromBech32(address);
    return {
      derivationPath: derivationPath,
      value: address,
    };
  }
}
