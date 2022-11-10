import { FEATURED_ASSETS } from '../../constants';
import { Asset } from '../../domain/asset';

/**
 * Takes a list of assets, and sort it by the following criteria:
 * - first, featured assets order by L-BTC, USDT and LCAD
 * - all remaining assets in no particular order
 * @param assets list of assets in no particular order
 * @returns assets sorted by criteria defined above
 */
export function sortAssets(
  assets: Asset[]
): Asset[] {
  let newAsset;
  const newAssetTicker = 'Any';
  const featuredAssets: Asset[] = [];
  const remainingAssets = [];
  for (const asset of assets) {
    if (FEATURED_ASSETS.includes(asset.assetHash)) {
      featuredAssets.push(asset);
      continue;
    }
    if (asset.ticker === newAssetTicker) {
      newAsset = asset;
    } else {
      remainingAssets.push(asset);
    }
  }
  // join the two sets of assets and add 'Any' at the end of the list if it exists
  const sortedAssets = [...featuredAssets, ...remainingAssets];
  if (newAsset) sortedAssets.push(newAsset);
  return sortedAssets;
}
