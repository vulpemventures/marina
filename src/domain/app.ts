import type { ChainAPI, NetworkString } from 'ldk';
import { Electrs, ElectrsBatchServer } from 'ldk';
import type { AccountID } from './account';
import type { IError } from './common';

export interface IApp {
  errors?: Record<string, IError>;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  network: NetworkString;
  explorerByNetwork: Record<NetworkString, ExplorerURLs>;
  changeAccount: AccountID;
}

export type ExplorerType = 'Blockstream' | 'Testnet' | 'Mempool' | 'Nigiri' | 'Custom';

export interface ExplorerURLs {
  type: ExplorerType;
  electrsURL: string;
  esploraURL: string;
  batchServerURL?: string;
  wsURL?: string;
}

const VULPEM_ELECTRS_BATCH_TESTNET = 'https://electrs-batch-testnet.vulpem.com';

export const BlockstreamExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  electrsURL: 'https://blockstream.info/liquid',
  esploraURL: 'https://blockstream.info/liquid/api',
  batchServerURL: 'https://electrs-batch-blockstream.vulpem.com',
};

export const BlockstreamTestnetExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  electrsURL: 'https://blockstream.info/liquidtestnet',
  esploraURL: 'https://blockstream.info/liquidtestnet/api',
  batchServerURL: VULPEM_ELECTRS_BATCH_TESTNET,
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  electrsURL: 'http://localhost:5001',
  esploraURL: 'http://localhost:3001',
  wsURL: 'ws://localhost:3001',
};

export const MempoolExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  electrsURL: 'https://liquid.network',
  esploraURL: 'https://liquid.network/api',
  batchServerURL: 'https://electrs-batch-mempool.vulpem.com',
};

export const MempoolTestnetExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  electrsURL: 'https://liquid.network/testnet',
  esploraURL: 'https://liquid.network/liquidtestnet/api',
  batchServerURL: VULPEM_ELECTRS_BATCH_TESTNET,
};

/**
 * @param URLs a set of URLs describing the explorer to use
 * @returns batch server ChainAPI if batchServerURL is defined, otherwise Electrs
 */
export function explorerURLsToChainAPI(URLs: ExplorerURLs): ChainAPI {
  if (URLs.batchServerURL) {
    return ElectrsBatchServer.fromURLs(URLs.batchServerURL, URLs.esploraURL);
  }

  return Electrs.fromURL(URLs.esploraURL);
}
