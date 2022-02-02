// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import { networks, NetworkString } from 'ldk';
import { IAssets } from '../../domain/assets';
import { extractErrorMessage } from '../../presentation/utils/error';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<string> => {
  try {
    const response = await axios.post(`${baseUrl}/tx`, txHex);
    if (response.status !== 200) throw new Error(response.data);
    return response.data;
  } catch (error: unknown | AxiosError) {
    throw new Error(extractErrorMessage(error));
  }
};

export const lbtcAssetByNetwork = (net: NetworkString): string => {
  return networks[net].assetHash;
};

export const usdtAssetHash = (assets: IAssets): string | undefined => {
  return Object.entries(assets).find(([_, { ticker }]) => ticker === 'USDt')?.[0];
};
