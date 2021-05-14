import { toOutpoint, UtxoInterface } from 'ldk';

export const toStringOutpoint = (utxo: UtxoInterface) => {
  const outpoint = toOutpoint(utxo);
  return `${outpoint.txid}:${outpoint.vout}`;
};
