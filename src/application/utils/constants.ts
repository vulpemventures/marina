import lightniteAssetsHashes from '../constants/lightnite_asset_hash.json';
import blockstreamAssetHashes from '../constants/blockstream_asset_hash.json';
import { networks, NetworkString } from 'ldk';

export const INVALID_MNEMONIC_ERROR = 'Invalid mnemonic';
export const INVALID_PASSWORD_ERROR = 'Invalid password';

export const feeLevelToSatsPerByte: { [key: string]: number } = {
  '0': 0.1,
  '50': 0.1,
  '100': 0.1,
};

export const taxiURL: Record<NetworkString, string> = {
  regtest: 'http://localhost:8000',
  testnet: 'http://todo.com', // TODO is there a taxi running on testnet ?
  liquid: 'https://grpc.liquid.taxi',
};

const makeImagePath = (fileName: string): string => `assets/images/liquid-assets/${fileName}`;

const LBTC_IMG = makeImagePath('liquid-btc.svg');
const USDT_IMG = makeImagePath('liquid-tether.svg');
const LCAD_IMG = makeImagePath('liquid-cad.png');
const JADE_IMG = makeImagePath('blockstream-jade.svg');
const BLOCKSTREAM_IMG = makeImagePath('blockstream.png');
const LIGHTNITE_IMG = makeImagePath('lightnite.png');

const UNKNOW_IMG = makeImagePath('question-mark.svg'); // this is used in case of not found

const assetHashToImagePath = new Map<string, string>()
  .set(networks.liquid.assetHash, LBTC_IMG)
  .set(networks.regtest.assetHash, LBTC_IMG)
  .set(networks.testnet.assetHash, LBTC_IMG)
  .set('ce091c998b83c78bb71a632313ba3760f1763d9cfcffae02258ffa9865a37bd2', USDT_IMG) // mainnet USDt
  .set('f3d1ec678811398cd2ae277cbe3849c6f6dbd72c74bc542f7c4b11ff0e820958', USDT_IMG) // testnet USDt
  .set('0e99c1a6da379d1f4151fb9df90449d40d0608f6cb33a5bcbfc8c265f42bab0a', LCAD_IMG) // mainnet LCAD
  .set('ac3e0ff248c5051ffd61e00155b7122e5ebc04fd397a0ecbdd4f4e4a56232926', LCAD_IMG) // testnet LCAD
  .set('78557eb89ea8439dc1a519f4eb0267c86b261068648a0f84a5c6b55ca39b66f1', JADE_IMG);

blockstreamAssetHashes.forEach((assetHash: string) => {
  assetHashToImagePath.set(assetHash, BLOCKSTREAM_IMG);
});

lightniteAssetsHashes.forEach((assetHash: string) => {
  assetHashToImagePath.set(assetHash, LIGHTNITE_IMG);
});

// getter function using to look into the constant map
// if the asset hash is not found, return the default image
export function getAssetImage(assetHash: string): string {
  const imgPath = assetHashToImagePath.get(assetHash);
  if (imgPath) return imgPath;
  return UNKNOW_IMG;
}

export const defaultPrecision = 8;
