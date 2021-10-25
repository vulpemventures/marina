import { Network } from './network';
import { Outpoint, RecipientInterface } from 'ldk';
import { DataRecipient } from 'marina-provider';

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
    allowCoin: Outpoint;
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
