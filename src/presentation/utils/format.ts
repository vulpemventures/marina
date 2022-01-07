import { Decimal } from 'decimal.js';
import { defaultPrecision } from '../../application/utils/constants';

export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

// If digits are more than 10 then truncate to 2 decimals without rounding
// Add ellipsis
export const formatDecimalAmount = (amount: number): string => {
  let formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
  if (!Number.isInteger(amount) && formattedAmount.length > 10) {
    formattedAmount = `${formattedAmount.slice(0, formattedAmount.indexOf('.') + 3)}...`;
  }
  return formattedAmount;
};

export function decimalCount(num: number) {
  const numStr = String(num);
  if (numStr.includes('.')) {
    return numStr.split('.')[1].length;
  }
  return 0;
}

export function toSatoshi(fractional: number, precision: number = defaultPrecision): number {
  return new Decimal(fractional).mul(Decimal.pow(10, precision)).toNumber();
}

// Converting to string will trim trailing zeros
export function fromSatoshiStr(sats: number, precision: number = defaultPrecision): string {
  return fromSatoshi(sats, precision).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

export function fromSatoshi(sats: number, precision: number = defaultPrecision): number {
  return new Decimal(sats).div(Decimal.pow(10, precision)).toNumber();
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

export const getMinAmountFromPrecision = (precision: number) => {
  return 1 * Math.pow(10, -precision);
};
