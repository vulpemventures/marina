import { Asset } from '../../domain/assets';

/**
 * Takes a list of assets, and sort it by the following criteria:
 * - first, featured assets order by L-BTC, USDT and LCAD
 * - all remaining assets in no particular order
 * @param assets list of assets in no particular order
 * @returns assets sorted by criteria defined above
 */
export function sortAssets(
  assets: (Asset & { assetHash: string })[]
): (Asset & { assetHash: string })[] {
  let newAsset;
  const newAssetTicker = 'Any';
  const sortedFeaturedTickers = ['L-BTC', 'USDT', 'LCAD'];
  const featuredAssets: (Asset & { assetHash: string })[] = [];
  // push featured assets in order
  for (const ticker of sortedFeaturedTickers) {
    for (const asset of assets) {
      if (ticker === asset.ticker) {
        featuredAssets.push(asset);
      }
      if (asset.ticker === newAssetTicker) {
        newAsset = asset;
      }
    }
  }
  // get remaining assets - also includes new asset (has ticker 'Any')
  const forbiddenTickers = [...sortedFeaturedTickers, newAssetTicker];
  const remainingAssets = assets.filter((asset) => !forbiddenTickers.includes(asset.ticker));
  // join the two sets of assets and add 'Any' at the end of the list if it exists
  const sortedAssets = [...featuredAssets, ...remainingAssets];
  if (newAsset) sortedAssets.push(newAsset);
  return sortedAssets;
}
