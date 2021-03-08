import { toOutpoint, UtxoInterface } from 'ldk';

export const utxoMapToArray = (utxoMap: Map<string, UtxoInterface>): UtxoInterface[] => {
  const utxos: UtxoInterface[] = [];
  utxoMap.forEach((utxo) => {
    utxos.push(utxo);
  });
  return utxos;
};

export const toStringOutpoint = (utxo: UtxoInterface) => {
  const outpoint = toOutpoint(utxo);
  return `${outpoint.txid}:${outpoint.vout}`;
};
