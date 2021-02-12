export const formatAddress = (addr: string): string => {
  return `${addr.substring(0, 9)}...${addr.substring(addr.length - 9, addr.length)}`;
};

export const formatNetwork = (net: string): string => {
  return net.charAt(0).toUpperCase().concat(net.slice(1));
};

export const formatAmount = (amountInSatoshi: number): string => {
  return (amountInSatoshi / Math.pow(10, 8)).toFixed(8);
};

export const formatTxid = (txid: string): string => {
  return txid.substr(0, 6).concat('.......').concat(txid.substr(25, 6));
}