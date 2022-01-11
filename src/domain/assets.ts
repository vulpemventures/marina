import { defaultPrecision } from './../application/utils/constants';
export type IAssets = Record<string, Asset>;

export type Asset = {
  name: string;
  precision: number;
  ticker: string;
};

export type AssetGetter = (assetHash: string) => Asset & { assetHash: string };

export function assetGetterFromIAssets(assets: IAssets): AssetGetter {
  return (assetHash: string) => {
    const a = assets[assetHash];
    const defaultAssetObject = {
      assetHash,
      ticker: assetHash.slice(0, 4).toUpperCase(),
      precision: defaultPrecision,
      name: 'Unknown',
    };

    if (!a) {
      return defaultAssetObject;
    }

    return {
      assetHash,
      ticker: a ? a.ticker : defaultAssetObject.ticker,
      precision: a ? a.precision : defaultAssetObject.precision,
      name: a ? a.name : defaultAssetObject.name,
    };
  };
}
