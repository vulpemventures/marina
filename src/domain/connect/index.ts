import { Network } from '../app/value-objects';

export type ConnectData = {
  enabledSites: string[];
  enableSitePending: string;
  tx?: {
    amount?: string;
    assetHash?: string;
    hostname?: string;
    recipient?: string;
    pset?: string;
  };
  msg?: {
    hostname?: string;
    message?: string;
  }
};

export type ConnectDataByNetwork = Record<Network['value'], ConnectData>;
