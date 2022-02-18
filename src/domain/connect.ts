import { NetworkString, RecipientInterface } from 'ldk';
import { DataRecipient } from 'marina-provider';

export interface AssetAmount {
  asset: string;
  amount: number;
}

export type ConnectData = {
  enabledSites: Record<NetworkString, string[]>;
  hostnameSelected: string;
  tx?: {
    recipients?: RecipientInterface[];
    feeAssetHash?: string;
    hostname?: string;
    pset?: string;
    data?: DataRecipient[];
    isTaproot?: boolean;
  };
  msg?: {
    hostname?: string;
    message?: string;
  };
};

export function newEmptyConnectData(): ConnectData {
  return {
    enabledSites: {
      liquid: [],
      regtest: [],
      testnet: [],
    },
    hostnameSelected: '',
  };
}
