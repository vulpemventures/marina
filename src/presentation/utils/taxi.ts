import { TaxiClient } from 'taxi-protobuf/generated/js/TaxiServiceClientPb';
import {
  AssetDetails,
  ListAssetsRequest,
  TopupWithAssetReply,
  TopupWithAssetRequest,
} from 'taxi-protobuf/generated/js/taxi_pb';

export const fetchAssetsFromTaxi = async (taxiUrl: string): Promise<string[]> => {
  const client = new TaxiClient(taxiUrl, undefined);
  const res = await client.listAssets(new ListAssetsRequest(), null);
  return res.getAssetsList().map((asset: AssetDetails) => asset.getAssetHash());
};

export const fetchTopupFromTaxi = async (
  taxiUrl: string,
  asset: string
): Promise<TopupWithAssetReply.AsObject> => {
  const client = new TaxiClient(taxiUrl, undefined);
  const request = new TopupWithAssetRequest();
  request.setAssetHash(asset);
  const res = await client.topupWithAsset(request, null);
  return res.toObject();
};
