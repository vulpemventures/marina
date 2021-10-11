import { IError } from './common';
import { NetworkType } from './network';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  network: NetworkType;
  explorerByNetwork: Record<NetworkType, ExplorerURLs>;
}

export type ExplorerType = 'Blockstream' | 'Mempool' | 'Nigiri' | 'Custom';

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
