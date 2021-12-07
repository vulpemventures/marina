import axios from 'axios';
import { networks, NetworkString } from 'ldk';
import { IAssets } from '../../domain/assets';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<string> => {
  const response = await axios.post(`${baseUrl}/tx`, txHex);
  if (response.status !== 200) {
    console.error(response.data);
    throw new Error(response.data);
  }
  return response.data;
};

export const lbtcAssetByNetwork = (net: NetworkString): string => {
  return networks[net].assetHash;
};

export const usdtAssetHash = (assets: IAssets): string | undefined => {
  return Object.entries(assets).find(([_, { ticker }]) => ticker === 'USDt')?.[0];
};
