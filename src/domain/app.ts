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
  webExplorer: string;
  explorer: string;
}

export const BlockstreamExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorer: 'https://blockstream.info/liquid',
  explorer: 'https://blockstream.info/liquid/api',
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  webExplorer: 'http://localhost:5001',
  explorer: 'http://localhost:3001',
};

export const MempoolExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  webExplorer: 'https://mempool.space/liquid',
  explorer: 'https://mempool.space/liquid/api',
};
