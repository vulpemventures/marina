import axios from 'axios';

interface AssetDetails {
  assetHash: string,
  assetPrice: number,
  basisPoint: number,
}

export interface Topup {
  assetAmount: number,
  assetHash: string,
  assetSpread: number,
  partial: string,
  topupId: string,
}

export interface TopupWithAssetReply {
  expiry: number,
  privateBlindingKey: string,
  publicBlindingKey: string,
  topup?: Topup,
}

export const fetchAssetsFromTaxi = async (taxiUrl: string): Promise<string[]> => {
  const { data } = await axios.get(`${taxiUrl}/assets`);
  return data.assets.map((asset: AssetDetails) => asset.assetHash);
};

export const fetchTopupFromTaxi = async (
  taxiUrl: string,
  assetHash: string
): Promise<TopupWithAssetReply> => {
  const { data } = await axios.post(`${taxiUrl}/asset/topup`, { assetHash });
  return data;
};
