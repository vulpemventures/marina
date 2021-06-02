export type IAssets = Record<string, Asset>;

export type Asset = {
  name: string; precision: number; ticker: string
}

export type AssetGetter = (assetHash: string) => Asset & { assetHash: string }

export function assetGetterFromIAssets(assets: IAssets): AssetGetter {
  return (assetHash: string) => {
    const a = assets[assetHash]
    return {
      assetHash,
      ticker: a ? a.ticker : assetHash.slice(0, 4).toUpperCase(),
      precision: a.precision,
      name: a ? a.name : 'Unknown'
    }
  }
}