export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

export const taxiURL: Record<string, string> = {
  regtest: 'http://localhost:8000',
  mainnet: 'https://staging.api.liquid.taxi:8000',
};

export const explorerURL: Record<string, string> = {
  regtest: 'http://localhost:3001',
  mainnet: 'https://blockstream.info/liquid/api',
};

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
