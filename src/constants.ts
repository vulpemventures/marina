import { networks } from 'liquidjs-lib';

export const INVALID_MNEMONIC_ERROR = 'Invalid mnemonic';
export const INVALID_PASSWORD_ERROR = 'Invalid password';
export const SOMETHING_WENT_WRONG_ERROR = 'Oops, something went wrong...';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

const getLocalImagePath = (asset: string) => `/assets/images/liquid-assets/${asset}`;

// featured assets
const featuredAssets = {
  lbtc: {
    mainnet: networks.liquid.assetHash,
    testnet: networks.testnet.assetHash,
    regtest: networks.regtest.assetHash,
  },
  lcad: {
    mainnet: '0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a',
    testnet: 'ac3e0ff248c5051ffd61e00155b7122e5ebc04fd397a0ecbdd4f4e4a56232926',
  },
  usdt: {
    mainnet: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2',
    testnet: 'f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958',
  },
  fusd: {
    testnet: '0d86b2f6a8c3b02a8c7c8836b83a081e68b7e2b4bcdfc58981fc5486f59f7518',
  },
};

// featured assets map: from an asset hash, get local image path
const featuredAssetsMap = new Map<string, string>();
featuredAssetsMap.set(featuredAssets.lbtc.mainnet, getLocalImagePath('lbtc.png'));
featuredAssetsMap.set(featuredAssets.lbtc.testnet, getLocalImagePath('lbtc.png'));
featuredAssetsMap.set(featuredAssets.lbtc.regtest, getLocalImagePath('lbtc.png'));
featuredAssetsMap.set(featuredAssets.usdt.mainnet, getLocalImagePath('usdt.png'));
featuredAssetsMap.set(featuredAssets.usdt.testnet, getLocalImagePath('usdt.png'));
featuredAssetsMap.set(featuredAssets.lcad.mainnet, getLocalImagePath('lcad.png'));
featuredAssetsMap.set(featuredAssets.lcad.testnet, getLocalImagePath('lcad.png'));
featuredAssetsMap.set(featuredAssets.fusd.testnet, getLocalImagePath('fusd.png'));

export const FEATURED_ASSETS = Array.from(featuredAssetsMap.keys());

// given an asset hash, return url for image path from mempool
const getRemoteImagePath = (hash: string) => `https://liquid.network/api/v1/asset/${hash}/icon`;

// getter function using to look for assets on testnet and regtest
// and return the correct asset icon path (with asset hash from mainnet)
export function getAssetImagePath(assetHash: string): string {
  const localImagePath = featuredAssetsMap.get(assetHash);
  if (localImagePath) return localImagePath;
  return getRemoteImagePath(assetHash);
}

export const defaultPrecision = 8;
