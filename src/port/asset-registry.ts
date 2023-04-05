import type { NetworkString, Asset } from 'marina-provider';
import { BlockstreamExplorerURLs, BlockstreamTestnetExplorerURLs } from '../domain/explorer';

function getDefaultAssetEndpoint(network: NetworkString) {
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

export interface AssetRegistry {
  getAsset(assetId: string): Promise<Asset>;
}

export class DefaultAssetRegistry implements AssetRegistry {
  static NOT_FOUND_ERROR_LOCKTIME = 60 * 1000 * 60; // 1 hour
  private assetsLocker: Map<string, number> = new Map();
  private endpoint: string;

  constructor(network: NetworkString) {
    this.endpoint = getDefaultAssetEndpoint(network);
  }

  private isLocked(assetHash: string): boolean {
    const lock = this.assetsLocker.get(assetHash);
    return !!(lock && lock > Date.now());
  }

  private async fetchAssetDetails(assetHash: string): Promise<Asset> {
    const response = await fetch(`${this.endpoint}/${assetHash}`);

    if (!response.ok) {
      // if 404, set a lock on that asset for 1 hour
      if (response.status === 404) {
        this.assetsLocker.set(
          assetHash,
          Date.now() + DefaultAssetRegistry.NOT_FOUND_ERROR_LOCKTIME
        );
      }
    }

    const { name, ticker, precision } = await response.json();
    return {
      name: name ?? 'Unknown',
      ticker: ticker ?? assetHash.substring(0, 4),
      precision: precision ?? 8,
      assetHash,
    };
  }

  getAsset(assetHash: string): Promise<Asset> {
    try {
      if (this.isLocked(assetHash)) throw new Error('Asset locked'); // fallback to catch block
      this.assetsLocker.delete(assetHash);
      return this.fetchAssetDetails(assetHash);
    } catch (e) {
      return Promise.resolve({
        name: 'Unknown',
        ticker: assetHash.substring(0, 4),
        precision: 8,
        assetHash,
      });
    }
  }
}
