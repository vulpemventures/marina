import { Decimal } from 'decimal.js';
import { defaultPrecision } from '../../domain/constants';

export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

// If digits are more than 10 then truncate to 2 decimals without rounding
// Add ellipsis
export const formatDecimalAmount = (amount: number, truncate = true): string => {
  if (amount === 0) return '0';
  let formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
  if (!truncate) return formattedAmount;
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

// Converting to string with spaces every 3 digits
// 0.12345678 => 0.12 345 678
export const fromSatoshiWithSpaces = (
  sats: number,
  precision: number = defaultPrecision
): string => {
  if (sats === 0) return '0';

  const clusterSize = 3;

  const reverseString = (str: string) => str.split('').reverse().join('');

  const str = reverseString(
    fromSatoshi(sats, precision).toLocaleString('en-US', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    })
  );

  let start = 0;
  let formated = '';

  while (start < str.length) {
    let finish = start + clusterSize > str.length ? str.length : start + clusterSize;
    if (/\./.exec(str.slice(start, finish))) finish += 1;
    formated += str.slice(start, finish);
    if (finish < str.length) formated += ' ';
    start = finish;
  }

  return reverseString(formated);
};

export const fromSpacesToSatoshis = (str: string) => toSatoshi(Number(str.replace(/ /g, '')));
