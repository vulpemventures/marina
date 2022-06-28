// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import type { NetworkString } from 'ldk';
import { networks } from 'ldk';
import type { IAssets } from '../../domain/assets';
import { extractErrorMessage } from '../../presentation/utils/error';
import type { TransactionID } from 'marina-provider';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<TransactionID> => {
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
