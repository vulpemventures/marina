import { IError } from './common';
import { Network } from './network';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isWalletVerified: boolean;
  isOnboardingCompleted: boolean;
  network: Network;
  explorerByNetwork: Record<Network, ExplorerURLs>;
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
  electrsURL: 'https://mempool.space/liquid',
  esploraURL: 'https://mempool.space/liquid/api',
};
