import lightniteAssetsHashes from '../constants/lightnite_asset_hash.json';
import blockstreamAssetHashes from '../constants/blockstream_asset_hash.json';
import { networks } from 'ldk';

export const INVALID_MNEMONIC_ERROR = 'Invalid mnemonic';
export const INVALID_PASSWORD_ERROR = 'Invalid password';
export const SOMETHING_WENT_WRONG_ERROR = 'Oops, something went wrong...';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

const remoteImagePath = 'https://liquid.network/api/v1/asset';

const makeRemoteImagePath = (assetHash: string): string => `${remoteImagePath}/${assetHash}/icon`;
const makeLocalImagePath = (fileName: string): string => `assets/images/liquid-assets/${fileName}`;

const LIGHTNITE_IMG = makeLocalImagePath('lightnite.png'); // default for lightnite assets
const UNKNOW_IMG = makeLocalImagePath('question-mark.svg'); // this is used in case of not found

// maps assetHash to a url
const assetHashToImagePath = new Map<string, string>();

// set icons for all assets received from blockstream icons
for (const assetHash of blockstreamAssetHashes) {
  assetHashToImagePath.set(assetHash, makeRemoteImagePath(assetHash));
}

// set icons for lbt in testnet and regtest
const lbtcIcon = makeRemoteImagePath(networks.liquid.assetHash);
assetHashToImagePath.set(networks.testnet.assetHash, lbtcIcon);
assetHashToImagePath.set(networks.regtest.assetHash, lbtcIcon);

// set icons for usdt in testnet
const usdtAssetHash = {
  liquid: 'ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2',
  testnet: 'f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958',
};
if (blockstreamAssetHashes.includes(usdtAssetHash.liquid)) {
  const usdtIcon = makeRemoteImagePath(usdtAssetHash.liquid);
  assetHashToImagePath.set(usdtAssetHash.testnet, usdtIcon);
}

// set icons for lcad in testnet
const lcadAssetHash = {
  liquid: '0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a',
  testnet: 'ac3e0ff248c5051ffd61e00155b7122e5ebc04fd397a0ecbdd4f4e4a56232926',
};
if (blockstreamAssetHashes.includes(lcadAssetHash.liquid)) {
  const lcadIcon = makeRemoteImagePath(lcadAssetHash.liquid);
  assetHashToImagePath.set(lcadAssetHash.testnet, lcadIcon);
}

// set a default icon for each lightnite asset if doesn't exists already
lightniteAssetsHashes.forEach((assetHash: string) => {
  if (!assetHashToImagePath.get(assetHash)) {
    assetHashToImagePath.set(assetHash, LIGHTNITE_IMG);
  }
});

// getter function using to look into the constant map
// if the asset hash is not found, return the default image
export function getAssetImage(assetHash: string): string {
  const imgPath = assetHashToImagePath.get(assetHash);
  if (imgPath) return imgPath;
  return UNKNOW_IMG;
}

export const defaultPrecision = 8;

// minimum time utxos are locked (5 minutes)
export const lockedUtxoMinimunTime = 300_000;
