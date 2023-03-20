export function h2b(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

export async function fetchAsset(webExplorerURL: string, asset: string) {
  const response = await fetch(`${webExplorerURL}/api/asset/${asset}`);
  const { name, ticker, precision } = await response.json();
  return {
    name: name || 'Unknown',
    ticker: ticker || asset.substring(0, 4),
    precision: precision || 8,
    assetHash: asset,
  };
}
