import { networks } from 'ldk';

export const INVALID_MNEMONIC_ERROR = 'Invalid mnemonic';
export const INVALID_PASSWORD_ERROR = 'Invalid password';
export const SOMETHING_WENT_WRONG_ERROR = 'Oops, something went wrong...';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

// featured assets
const featuredAssets = {
  usdt: {
    liquid: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2',
    testnet: 'f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958',
  },
  lcad: {
    liquid: '0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a',
    testnet: 'ac3e0ff248c5051ffd61e00155b7122e5ebc04fd397a0ecbdd4f4e4a56232926',
  },
};

// featured assets map
// translates testnet and regtest asset hashes to mainnet asset hash
const featuredAssetsMap = new Map<string, string>();
featuredAssetsMap.set(networks.testnet.assetHash, networks.liquid.assetHash);
featuredAssetsMap.set(networks.regtest.assetHash, networks.liquid.assetHash);
featuredAssetsMap.set(featuredAssets.usdt.testnet, featuredAssets.usdt.liquid);
featuredAssetsMap.set(featuredAssets.lcad.testnet, featuredAssets.lcad.liquid);

// given an asset hash, return url for image path
const getImagePath = (hash: string): string => {
  const remoteServer = 'https://liquid.network/api/v1/asset';
  return `${remoteServer}/${hash}/icon`;
};

// getter function using to look for assets on testnet and regtest
// and return the correct asset icon path (with asset hash from mainnet)
export function getAssetImage(assetHash: string): string {
  const mainnetHash = featuredAssetsMap.get(assetHash);
  if (mainnetHash) return getImagePath(mainnetHash);
  return getImagePath(assetHash);
}

export function onErrorImg(event: any): void {
  const imgPath = '/assets/images/question-mark.svg';
  event.currentTarget.onerror = null; // prevents looping
  event.currentTarget.src = imgPath;
}

export const defaultPrecision = 8;

// minimum time utxos are locked (5 minutes)
export const lockedUtxoMinimunTime = 300_000;
