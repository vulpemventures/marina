import { UtxoInterface, Outpoint } from 'ldk';

export * from './address';
export * from './format';
export * from './network';
export * from './taxi';
export * from './transaction';

export const assetInfoByHash: Record<string, any> = {
  '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
    ticker: 'L-BTC',
    name: 'Liquid Bitcoin',
    imgPath: 'assets/images/liquid-assets/liquid-btc.svg',
  },
  '9999437ead76b94dc2a175b47adfcd192a23bf17f15152d869480e8ac44bb6fa': {
    ticker: 'USDt',
    name: 'Tether',
    imgPath: 'assets/images/liquid-assets/liquid-tether.png',
  },
};

export const utxoMapToArray = (utxoMap: Map<Outpoint, UtxoInterface>): UtxoInterface[] => {
  const utxos: UtxoInterface[] = [];
  utxoMap.forEach((utxo) => {
    utxos.push(utxo);
  });
  return utxos;
};
