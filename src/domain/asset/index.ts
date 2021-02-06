import { Network } from '../app/value-objects';

export type Assets = {
  [hash: string]: { name: string; precision?: number; ticker: string; quantity?: number };
};

export type AssetsByNetwork = Record<Network['value'], Assets>;
