import type { NetworkString } from 'ldk';
import { address, networks } from 'ldk';

export const isConfidentialAddress = (addr: string): boolean => {
  try {
    address.fromConfidential(addr);
    return true;
  } catch (ignore) {
    return false;
  }
};

export const isValidAddressForNetwork = (addr: string, net: NetworkString): boolean => {
  try {
    const network = networks[net];
    if (!network) {
      throw new Error('network not found');
    }
    address.toOutputScript(addr, network);
    return true;
  } catch (ignore) {
    return false;
  }
};
