import axios from 'axios';
import type { NetworkString } from 'ldk';

interface AssetDetails {
  assetHash: string;
  assetPrice: number;
  basisPoint: number;
}

export interface Topup {
  partial: string;
  topupId: string;
}

interface ProtoTopupWithAssetReply {
  expiry: number;
  assetAmount: number;
  assetHash: string;
  assetSpread: number;
  inBlindingData: { asset: string, value: string, assetBlinder: string, valueBlinder: string }[];
  topup: Topup;
}

export type TopupWithAssetReply = Omit<ProtoTopupWithAssetReply, 'assetAmount' | 'assetSpread'> & { assetAmount: number; assetSpread: number };

export const fetchAssetsFromTaxi = async (taxiUrl: string): Promise<string[]> => {
  const { data } = await axios.get(`${taxiUrl}/assets`);
  return data.assets.map((asset: AssetDetails) => asset.assetHash);
};

function isTopup(obj: any): obj is ProtoTopupWithAssetReply['topup'] {
  return obj.topupId && typeof obj.topupId === 'string' && obj.partial && typeof obj.partial === 'string';
}

function isProtoTopupWithAssetReply(obj: any): obj is ProtoTopupWithAssetReply {
  return isTopup(obj.topup) 
    && obj.expiry && typeof obj.expiry === 'string' 
    && obj.assetSpread && obj.assetHash && obj.assetAmount 
    && typeof obj.assetAmount === 'string' && typeof obj.assetHash === 'string' 
    && typeof obj.assetSpread === 'string' && Array.isArray(obj.inBlindingData);
}

function castToNumber(data: ProtoTopupWithAssetReply, key: keyof ProtoTopupWithAssetReply): number {
  const num = Number(data[key]);
  if (Number.isNaN(num) || !Number.isSafeInteger(num)) {
    throw new Error(`error coercing topup ${key} ${data[key]} into number`);
  }
  return num;
}

function newTopupWithAssetReply(data: ProtoTopupWithAssetReply): TopupWithAssetReply {
  return {
    ...data,
    assetAmount: castToNumber(data, 'assetAmount'),
    assetSpread: castToNumber(data, 'assetSpread'),
  };
}

// TODO estimated tx size & milisat/byte
export async function fetchTopupFromTaxi(
  taxiUrl: string,
  assetHash: string
): Promise<TopupWithAssetReply> {
  const { data, status } = await axios.post(`${taxiUrl}/asset/topup`, { assetHash, estimated_tx_size: 9000, millisat_per_byte: 100 });
  if (status !== 200) {
    throw new Error(data.message);
  }

  if (isProtoTopupWithAssetReply(data)) return newTopupWithAssetReply(data);
  console.error('invalid taxi reply', data);
  throw new Error('malformed topup response');
};

export const taxiURL: Record<NetworkString, string> = {
  regtest: 'http://localhost:8000',
  testnet: 'https://stage-api.liquid.taxi/v1',
  liquid: 'https://grpc.liquid.taxi/v1',
};
