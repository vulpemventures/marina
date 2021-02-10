import { UtxoInterface, Outpoint } from 'ldk';

export * from './address';
export * from './constants';
export * from './format';
export * from './network';
export * from './taxi';
export * from './transaction';

export const utxoMapToArray = (utxoMap: Map<Outpoint, UtxoInterface>): UtxoInterface[] => {
  const utxos: UtxoInterface[] = [];
  utxoMap.forEach((utxo) => {
    utxos.push(utxo);
  });
  return utxos;
};
