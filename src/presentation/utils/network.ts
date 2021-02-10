import axios from 'axios';
import { networks } from 'ldk';

export const broadcastTx = async (baseUrl: string, txHex: string): Promise<string> => {
  const response = await axios.post(`${baseUrl}/tx`, txHex);
  if (response.status !== 200) {
    throw new Error(response.data);
  }
  return response.data.txId;
};

export const lbtcAssetByNetwork = (net: string): string => {
  if (net === 'regtest') {
    return networks.regtest.assetHash;
  }
  return networks.liquid.assetHash;
};
