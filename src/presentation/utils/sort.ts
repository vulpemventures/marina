import { Asset } from '../../domain/assets';

/**
 * Takes a list of assets, and sort it by the following criteria:
 * - first, featured assets order by L-BTC, USDT and LCAD
 * - finally, all remaining assets in no particular order
 * @param assets list of assets in no particular order
 * @returns assets sorted by criteria defined above
 */
export function sortAssets(
  assets: (Asset & { assetHash: string })[]
): (Asset & { assetHash: string })[] {
  const sortedFeaturedTickers = ['L-BTC', 'USDT', 'LCAD'];
  const featuredAssets: (Asset & { assetHash: string })[] = [];
  for (const ticker of sortedFeaturedTickers) {
    for (const asset of assets) {
      if (ticker === asset.ticker) {
        featuredAssets.push(asset);
      }
    }
  }
  const remainingAssets = assets.filter((asset) => !sortedFeaturedTickers.includes(asset.ticker));
  return [...featuredAssets, ...remainingAssets];
}
