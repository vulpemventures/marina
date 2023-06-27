// docs: https://docs.boltz.exchange/en/latest/api/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import axios, { AxiosError } from 'axios';
import type { NetworkString } from 'marina-provider';
import { extractErrorMessage } from '../../extension/utility/error';

interface CreateSwapCommonRequest {
  type: 'submarine' | 'reversesubmarine';
  pairId: 'L-BTC/BTC';
  orderSide: 'buy' | 'sell';
}

export interface CreateSwapCommonResponse {
  id: string;
  timeoutBlockHeight: number;
}

export type SubmarineSwapRequest = {
  invoice: string;
  refundPublicKey: string;
};

export type SubmarineSwapResponse = {
  acceptZeroConf: boolean;
  address: string;
  bip21: string;
  blindingKey: string; // private
  expectedAmount: number;
  redeemScript: string;
};

export type ReverseSubmarineSwapRequest = {
  preimageHash: string;
  invoiceAmount: number;
  claimPublicKey: string;
};

export type ReverseSubmarineSwapResponse = {
  blindingKey: string; // private
  invoice: string;
  lockupAddress: string;
  onchainAmount: number;
  redeemScript: string;
};

export const boltzUrl: Record<NetworkString, string> = {
  regtest: 'http://localhost:9090',
  testnet: 'https://testnet.boltz.exchange/api',
  liquid: 'https://boltz.exchange/api',
};

export default class Boltz {
  url: string;
  constructor(network: NetworkString, url: string = boltzUrl[network]) {
    this.url = url;
  }

  createSubmarineSwap = async (
    req: SubmarineSwapRequest
  ): Promise<CreateSwapCommonResponse & SubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: 'submarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'sell',
    };
    const params: CreateSwapCommonRequest & SubmarineSwapRequest = { ...base, ...req };
    return this.callCreateSwap(params);
  };

  createReverseSubmarineSwap = async (
    req: ReverseSubmarineSwapRequest
  ): Promise<CreateSwapCommonResponse & ReverseSubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: 'reversesubmarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'buy',
    };
    const params: CreateSwapCommonRequest & ReverseSubmarineSwapRequest = { ...base, ...req };
    return this.callCreateSwap(params);
  };

  getPair = async (pair: string) => {
    const data = await this.getApi(`${this.url}/getpairs`);
    if (!data?.pairs?.[pair]) return;
    return data.pairs[pair];
  };

  private callCreateSwap = async (
    params: CreateSwapCommonRequest
  ): Promise<CreateSwapCommonResponse & any> => {
    return this.postApi(`${this.url}/createswap`, params);
  };

  private getApi = async (url: string): Promise<any> => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { status, data } = await axios.get(url, config);
      if (status !== 200) throw new Error(data);
      return data;
    } catch (error: unknown | AxiosError) {
      const errorExtracted = extractErrorMessage(error);
      throw new Error(errorExtracted);
    }
  };

  private postApi = async (url: string, params: any = {}): Promise<any> => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { status, data } = await axios.post(url, params, config);
      if (status !== 201) throw new Error(data);
      return data;
    } catch (error: unknown | AxiosError) {
      const errorExtracted = extractErrorMessage(error);
      throw new Error(errorExtracted);
    }
  };
}
