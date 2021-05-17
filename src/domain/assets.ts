import { Network } from "./network";

export type IAssets = {
  [hash: string]: { name: string; precision: number; ticker: string };
};

export type AssetsByNetwork = Record<Network, IAssets>;
