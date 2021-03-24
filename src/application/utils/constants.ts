import { Network } from '../../domain/app/value-objects';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

export const taxiURL: Record<string, string> = {
  regtest: 'http://localhost:8000',
  liquid: 'https://grpc.liquid.taxi',
};

export const explorerApiUrl: Record<Network['value'], string> = {
  regtest: 'http://localhost:3001',
  liquid: 'https://blockstream.info/liquid/api',
};

const featuredAssets: Record<string, string> = {
  '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d':
    'assets/images/liquid-assets/liquid-btc.svg',
  ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2:
    'assets/images/liquid-assets/liquid-tether.png',
  '0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a':
    'assets/images/liquid-assets/liquid-cad.png',
  '': 'assets/images/liquid-assets/question-mark.svg',
};


const lightniteAssets: Record<string, string> = {};
const lightniteAssetsHashes = require('../constants/lightnite_asset_hash.json');
lightniteAssetsHashes.forEach((assetHash: string) => {
  lightniteAssets[assetHash] = 'assets/images/liquid-assets/lightnite.png'
});

export const imgPathMapMainnet: Record<string, string> = {
  ...featuredAssets,
  ...lightniteAssets,
};

export const imgPathMapRegtest: Record<string, string> = {
  'L-BTC': 'assets/images/liquid-assets/liquid-btc.svg',
  USDt: 'assets/images/liquid-assets/liquid-tether.png',
  LCAD: 'assets/images/liquid-assets/liquid-cad.png',
  '': 'assets/images/liquid-assets/question-mark.svg',
};

export const defaultPrecision = 8;
