import { Network } from "./network";

export type ConnectData = {
  enabledSites: string[];
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
  };
};

export function newEmptyConnectData(): ConnectData {
  return {
    enabledSites: []
  }
}

export type ConnectDataByNetwork = Record<Network, ConnectData>;
