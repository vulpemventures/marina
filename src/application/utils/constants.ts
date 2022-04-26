import lightniteAssetsHashes from '../constants/lightnite_asset_hash.json';
import blockstreamAssetHashes from '../constants/blockstream_asset_hash.json';
import _iconsImageData from '../constants/blockstream_icons_data_image.json';
import { networks } from 'ldk';

export const INVALID_MNEMONIC_ERROR = 'Invalid mnemonic';
export const INVALID_PASSWORD_ERROR = 'Invalid password';
export const SOMETHING_WENT_WRONG_ERROR = 'Oops, something went wrong...';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

const iconsImageData = _iconsImageData as Record<string, string>;

const makeDataImage = (dataImage: string): string => `data:image/png;base64, ${dataImage}`;
const makeImagePath = (fileName: string): string => `assets/images/liquid-assets/${fileName}`;

const BLOCKSTREAM_IMG = makeImagePath('blockstream.png'); // default for blockstream assets
const LIGHTNITE_IMG = makeImagePath('lightnite.png'); // default for lightnite assets
const UNKNOW_IMG = makeImagePath('question-mark.svg'); // this is used in case of not found

// maps assetHash to a string usable inside a <img src> tag
// string can be 'path/to/image.png' or 'data:image/png;base64, 123...'
const assetHashToImagePath = new Map<string, string>();

// set icons for all assets received from blockstream icons
for (const hash of Object.keys(iconsImageData)) {
  assetHashToImagePath.set(hash, makeDataImage(iconsImageData[hash]));
}

// set icons for lbt in testnet and regtest
const lbtc = makeDataImage(iconsImageData[networks.liquid.assetHash]);
assetHashToImagePath.set(networks.testnet.assetHash, lbtc);
assetHashToImagePath.set(networks.regtest.assetHash, lbtc);

// set icons for usdt in testnet
const usdt = makeDataImage(
  iconsImageData['ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2']
);
assetHashToImagePath.set('f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958', usdt);

// set icons for lcad in testnet
const lcad = makeDataImage(
  iconsImageData['0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a']
);
assetHashToImagePath.set('ac3e0ff248c5051ffd61e00155b7122e5ebc04fd397a0ecbdd4f4e4a56232926', lcad);

// set a default icon for each blockstream asset if doesn't exists already
blockstreamAssetHashes.forEach((assetHash: string) => {
  if (!iconsImageData[assetHash]) {
    assetHashToImagePath.set(assetHash, BLOCKSTREAM_IMG);
  }
});

// set a default icon for each lightnite asset if doesn't exists already
lightniteAssetsHashes.forEach((assetHash: string) => {
  if (!iconsImageData[assetHash]) {
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
