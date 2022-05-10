import axios, { AxiosError } from 'axios';
import { NetworkString } from 'ldk';
import { extractErrorMessage } from '../../presentation/utils/error';

interface CreateSwapCommonRequest {
  type: 'submarine' | 'reversesubmarine';
  pairId: 'L-BTC/BTC';
  orderSide: 'buy' | 'sell';
}

interface CreateSwapCommonResponse {
  id: string;
  timeoutBlockHeight: number;
}

export type SubmarineSwapRequest = {
  invoice: string;
  refundPublicKey: string;
};

export type ReverseSubmarineSwapRequest = {
  preimageHash: string;
  invoiceAmount: number;
  claimPublicKey: string;
};

export type SubmarineSwapResponse = {
  address: string;
  redeemScript: string;
  acceptZeroConf: boolean;
  expectedAmount: number;
  bip21: string;
};

export type ReverseSubmarineSwapResponse = {
  lockupAddress: string;
  invoice: string;
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
  constructor(network: NetworkString) {
    this.url = boltzUrl[network];
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
    return await this.callCreateSwap(params);
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
    return await this.callCreateSwap(params);
  };

  private callCreateSwap = async (params: CreateSwapCommonRequest): Promise<CreateSwapCommonResponse & any> => {
    try {
      const { status, data } = await axios.post(
        `${this.url}/createswap`, 
        params, 
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }  
      );
      if (status !== 201) {
        throw new Error(data);
      }
      return data;
    } catch (error: unknown | AxiosError) {
      const errorExtracted = extractErrorMessage(error);
      if (errorExtracted.error) {
        throw new Error(errorExtracted.error);
      }
      throw new Error(errorExtracted);
    }
  }
}
