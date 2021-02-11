import { address, networks } from 'ldk';

export const blindingKeyFromAddress = (addr: string): string => {
  return address.fromConfidential(addr).blindingKey.toString('hex');
};

export const isConfidentialAddress = (addr: string): boolean => {
  try {
    address.fromConfidential(addr);
    return true;
  } catch (ignore) {
    return false;
  }
};

export const isValidAddressForNetwork = (addr: string, net: string): boolean => {
  try {
    const network = networkFromString(net);
    address.toOutputScript(addr, network);
    return true;
  } catch (ignore) {
    return false;
  }
};

export const networkFromString = (net: string): networks.Network => {
  if (net === 'liquid') {
    return networks.liquid;
  }
  if (net === 'regtest') {
    return networks.regtest;
  }
  throw new Error('Invalid network');
};
