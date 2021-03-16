import axios from 'axios';
import { networks } from 'ldk';
import { Assets } from '../../domain/asset';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<string> => {
  const response = await axios.post(`${baseUrl}/tx`, txHex);
  if (response.status !== 200) {
    throw new Error(response.data);
  }
  return response.data;
};

export const lbtcAssetByNetwork = (net: string): string => {
  if (net === 'regtest') {
    return networks.regtest.assetHash;
  }
  return networks.liquid.assetHash;
};

export const usdtAssetHash = (assets: Assets): string | undefined => {
  return Object.entries(assets).find(([_, { ticker }]) => ticker === 'USDt')?.[0];
};
