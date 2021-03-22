import JSBI from 'jsbi';
import { defaultPrecision } from '../../application/utils';

export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

// If decimal number and total length is more than 6 then truncate to 2 decimals without rounding
// Add ellipsis
export const formatDecimalAmount = (amount: number): string => {
  let formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
  if (!Number.isInteger(amount) && formattedAmount.length > 6) {
    formattedAmount = `${formattedAmount.slice(0, formattedAmount.indexOf('.') + 3)}...`;
  }
  return formattedAmount;
};

export function pow(x: number, y: number): JSBI {
  return JSBI.exponentiate(JSBI.BigInt(x), JSBI.BigInt(y));
}

export function decimalCount(num: number) {
  const numStr = String(num);
  if (numStr.includes('.')) {
    return numStr.split('.')[1].length;
  }
  return 0;
}

export function toSatoshi(x: number, y: number = defaultPrecision): number {
  const int = x * Math.pow(10, decimalCount(x));
  return JSBI.toNumber(JSBI.multiply(JSBI.BigInt(int), pow(10, y - decimalCount(x))));
}

// Converting to string will trim trailing zeros
export function fromSatoshiStr(sats: number, precision: number = defaultPrecision): string {
  return fromSatoshi(sats, precision).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

export function fromSatoshi(sats: number, precision?: number): number {
  return sats / Math.pow(10, precision || defaultPrecision);
}

export function fromSatoshiFixed(sats: number, precision?: number, fixed?: number): string {
  return fromSatoshi(sats, precision).toFixed(fixed || 2);
}

export const formatTxid = (txid: string): string => {
  return txid.substr(0, 6).concat('.......').concat(txid.substr(25, 6));
};

export const formatAssetName = (name?: string): string => {
  const assetName = name || 'Unknown';
  if (assetName.length > 16) {
    return assetName.substr(0, 12).concat('...');
  }
  return assetName;
};
