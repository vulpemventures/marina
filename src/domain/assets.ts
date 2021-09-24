import { defaultPrecision } from './../application/utils/constants';
export type IAssets = Record<string, Asset>;

export type Asset = {
  name: string;
  precision: number;
  ticker: string;
  isRegtestAsset?: boolean;
};

export type AssetGetter = (assetHash: string) => Asset & { assetHash: string };

export function assetGetterFromIAssets(assets: IAssets): AssetGetter {
  return (assetHash: string) => {
    const a = assets[assetHash];
    return {
      assetHash,
      ticker: a ? a.ticker : assetHash.slice(0, 4).toUpperCase(),
      precision: a ? a.precision : defaultPrecision,
      name: a ? a.name : 'Unknown',
    };
  };
}
