import axios from 'axios';
import type { NetworkString } from 'ldk';

export interface TaxiAssetDetails {
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
      const num = Number(data.topup[key]);
      if (Number.isNaN(num) || !Number.isSafeInteger(num)) {
        throw new Error(`error coercing topup ${key} ${data.topup[key]} into number`);
      }
      data.topup[key] = num;
    }
  }
  return data;
};

export const taxiURL: Record<NetworkString, string> = {
  regtest: 'http://localhost:8000',
  testnet: 'https://stage-api.liquid.taxi/v1',
  liquid: 'https://grpc.liquid.taxi/v1',
};