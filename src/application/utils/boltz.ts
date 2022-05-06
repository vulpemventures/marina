import axios from 'axios';
import { NetworkString } from 'ldk';


interface CreateSwapCommonRequest {
  type: 'submarine' | 'reversesubmarine',
  pairId: 'L-BTC/BTC',
  orderSide: 'buy' | 'sell',
} 

interface CreateSwapResponseCommon {
  id: string,
  timeoutBlockHeight: number,
}


export interface SubmarineSwapRequest {
  invoice:string, 
  refundPublicKey: string
}

export interface ReverseSubmarineSwapRequest {
  preimageHash: string,
  invoiceAmount: number,
  claimPublicKey: string
} 

export interface SubmarineSwapResponse {
  address: string,
  redeemScript: string,
  acceptZeroConf: boolean,
  expectedAmount: number,
  bip21: string
}

export interface ReverseSubmarineSwapResponse {
  lockupAddress: string,
  invoice: string,
  onchainAmount: number,
}

const config = {
  headers: { 
    'Content-Type': 'application/json'
  }
};

export const boltzUrl:  Record<NetworkString, string> = {
  regtest: 'http://localhost:9090',
  testnet: 'https://testnet.boltz.exchange/api',
  liquid: 'https://boltz.exchange/api',
}

export default class Boltz {
  url: string;
  constructor(network: NetworkString) {
    this.url = boltzUrl[network];
  }
  
  createSubmarineSwap = async (req: SubmarineSwapRequest): Promise<SubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: 'submarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'sell'
    };
    const params = { ...base, ...req };
    const { status, statusText, data } = await axios.post(
      `${this.url}/createswap`, 
      params, 
      config
    );

    if (status !== 201) {
      throw new Error(`Boltz createSubmarineSwap failed with status ${status} - ${statusText}`);
    }

    return data as SubmarineSwapResponse;
  }

  createReverseSubmarineSwap = async (req: ReverseSubmarineSwapRequest): Promise<ReverseSubmarineSwapResponse> => {
    const base: CreateSwapCommonRequest = {
      type: 'submarine',
      pairId: 'L-BTC/BTC',
      orderSide: 'sell'
    };
    const params = { ...base, ...req };
    const { status, statusText, data } = await axios.post(
      `${this.url}/createswap`, 
      params, 
      config
    );

    if (status !== 201) {
      throw new Error(`Boltz createReverseSubmarineSwap failed with status ${status} - ${statusText}`);
    }

    return data as ReverseSubmarineSwapResponse;
  }
}



