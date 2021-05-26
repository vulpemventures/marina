export const toStringOutpoint = (outpoint: { txid: string; vout: number }) => {
  return `${outpoint.txid}:${outpoint.vout}`;
};
