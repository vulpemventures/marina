import type { Asset, NetworkString } from 'marina-provider';
import { BlockstreamExplorerURLs, BlockstreamTestnetExplorerURLs } from '../domain/explorer';

export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

function getAssetEndpoint(network: NetworkString) {
  switch (network) {
    case 'liquid':
      return BlockstreamExplorerURLs.webExplorerURL + '/api/asset';
    case 'testnet':
      return BlockstreamTestnetExplorerURLs.webExplorerURL + '/api/asset';
    case 'regtest':
      return 'http://localhost:3001/asset';
    default:
      throw new Error('Invalid network');
  }
}

export function assetIsUnknown(asset: Asset): boolean {
  return asset.name === 'Unknown';
}

export async function fetchAssetDetails(network: NetworkString, assetHash: string): Promise<Asset> {
  try {
    const response = await fetch(`${getAssetEndpoint(network)}/${assetHash}`);
    const { name, ticker, precision } = await response.json();
    return {
      name: name ?? 'Unknown',
      ticker: ticker ?? assetHash.substring(0, 4),
      precision: precision ?? 8,
      assetHash,
    };
  } catch (e) {
    console.debug(e);
    return {
      name: 'Unknown',
      ticker: assetHash.substring(0, 4),
      precision: 8,
      assetHash,
    };
  }
}
