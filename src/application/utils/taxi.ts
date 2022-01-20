import axios from 'axios';

interface AssetDetails {
  assetHash: string,
  basisPoint: number,
  assetPrice: number,
}

export interface Topup {
  topupId: string,
  partial: string,
  assetHash: string,
  assetAmount: number,
  assetSpread: number,
}

export interface TopupWithAssetReply {
  topup?: Topup,
  expiry: number,
  privateBlindingKey: string,
  publicBlindingKey: string,
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
