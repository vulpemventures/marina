export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

export const formatAmount = (amountInSatoshi: number): string => {
  return (amountInSatoshi / Math.pow(10, 8)).toFixed(8);
};

// If decimal number and total length is more than 6 then truncate to 2 decimals without rounding
// Add ellipsis
export const formatDecimalAmount = (amount: number): string => {
  let formattedAmount = amount.toString();
  if (!Number.isInteger(amount) && formattedAmount.length > 6) {
    formattedAmount = `${formattedAmount.slice(0, formattedAmount.indexOf('.') + 3)}...`;
  }
  return formattedAmount;
};

export const formatTxid = (txid: string): string => {
  return txid.substr(0, 6).concat('.......').concat(txid.substr(25, 6));
};
