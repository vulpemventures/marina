import { Network } from './network';
import { RecipientInterface } from 'ldk';
import { DataRecipient } from 'marina-provider';

export interface AssetAmount {
  asset: string;
  amount: number;
}

export type ConnectData = {
  enabledSites: Record<Network, string[]>;
  hostnameSelected: string;
  tx?: {
    recipients?: RecipientInterface[];
    feeAssetHash?: string;
    hostname?: string;
    pset?: string;
    data?: DataRecipient[];
  };
  msg?: {
    hostname?: string;
    message?: string;
  };
  allowance?: {
    requestParam: AssetAmount[];
  };
};

export function newEmptyConnectData(): ConnectData {
  return {
    enabledSites: {
      liquid: [],
      regtest: [],
    },
    hostnameSelected: '',
  };
}
