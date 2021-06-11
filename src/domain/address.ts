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
    // Non Confidential
    if (address.startsWith('ert') || address.startsWith('ex')) {
      addressLDK.fromBech32(address);
      return {
        derivationPath: derivationPath,
        value: address,
      };
    } else {
      // Confidential
      const { blindingKey, unconfidentialAddress } = addressLDK.fromConfidential(address);
      return {
        value: address,
        blindingKey: blindingKey,
        derivationPath: derivationPath,
        unconfidentialAddress: unconfidentialAddress,
      };
    }
  } catch (err) {
    throw new Error(err.message);
  }
}
