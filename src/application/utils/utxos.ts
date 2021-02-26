import { Outpoint, UtxoInterface } from 'ldk';

export const utxoMapToArray = (utxoMap: Map<Outpoint, UtxoInterface>): UtxoInterface[] => {
  const utxos: UtxoInterface[] = [];
  utxoMap.forEach((utxo) => {
    utxos.push(utxo);
  });
  return utxos;
};
