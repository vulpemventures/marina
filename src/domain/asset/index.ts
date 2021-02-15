import { Network } from '../app/value-objects';

export type Assets = {
  [hash: string]: { name: string; precision?: number; ticker: string };
};

export type AssetsByNetwork = Record<Network['value'], Assets>;
