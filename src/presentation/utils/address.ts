import { address } from 'ldk';

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

export const isValidAddress = (addr: string): boolean => {
  try {
    address.toOutputScript(addr);
    return true;
  } catch (ignore) {
    return false;
  }
};
