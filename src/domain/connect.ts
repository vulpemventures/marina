import { Network } from './network';
import { RecipientInterface } from 'ldk';

export type ConnectData = {
  enabledSites: Record<Network, string[]>;
  hostnameSelected: string;
  tx?: {
    recipients?: RecipientInterface[];
    feeAssetHash?: string;
    hostname?: string;
    pset?: string;
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
      regtest: []
    },
    hostnameSelected: ''
  };
}
