import axios from 'axios';
import { NetworkString } from 'ldk';

interface AssetDetails {
  assetHash: string;
  assetPrice: number;
  basisPoint: number;
}

export interface Topup {
  assetAmount: number;
  assetHash: string;
  assetSpread: number;
  partial: string;
  topupId: string;
}

export interface TopupWithAssetReply {
  expiry: number;
  privateBlindingKey: string;
  publicBlindingKey: string;
  topup?: Topup;
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
  // Coerce assetAmount and assetSpread into number
  // Temporary fix, waiting for this issue to close:
  // https://github.com/vulpemventures/taxi-daemon/issues/91
  if (data?.topup) {
    for (const key of ['assetAmount', 'assetSpread']) {
      data.topup[key] = parseInt(data.topup[key]);
      if (typeof data.topup[key] !== 'number') {
        throw new Error(`error coercing topup ${key} into number`);
      }
    }
  }
  return data;
};

export const taxiURL: Record<NetworkString, string> = {
  regtest: 'http://localhost:8000',
  testnet: 'https://grpc.liquid.taxi:18000/v1',
  liquid: 'https://grpc.liquid.taxi/v1',
};
