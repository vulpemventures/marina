import { IError } from './common';
import { Network } from './network';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  network: Network;
  explorerByNetwork: Record<Network, ExplorerURLs>;
}

export type ExplorerType = 'Blockstream' | 'Testnet' | 'Mempool' | 'Nigiri' | 'Custom';

export interface ExplorerURLs {
  type: ExplorerType;
  electrsURL: string;
  esploraURL: string;
}

export const BlockstreamExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  electrsURL: 'https://blockstream.info/liquid',
  esploraURL: 'https://blockstream.info/liquid/api',
};

export const BlockstreamTestnetExplorerURLs: ExplorerURLs = {
  type: 'Testnet',
  electrsURL: 'https://blockstream.info/liquidtestnet',
  esploraURL: 'https://blockstream.info/liquidtestnet/api',
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  electrsURL: 'http://localhost:5001',
  esploraURL: 'http://localhost:3001',
};

export const MempoolExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  electrsURL: 'https://liquid.network',
  esploraURL: 'https://liquid.network/api',
};
