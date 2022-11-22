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
  webExplorerURL: string;
  explorerURL: string; // most of the time webExplorerURL + '/api'
  websocketExplorerURL: string; // ws:// or wss:// endpoint
  batchServerURL?: string;
  wsURL?: string;
}

const VULPEM_ELECTRS_BATCH_TESTNET = 'https://electrs-batch-testnet.vulpem.com';

export const BlockstreamExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorerURL: 'https://blockstream.info/liquid',
  explorerURL: 'https://blockstream.info/liquid/api',
  batchServerURL: 'https://electrs-batch-blockstream.vulpem.com',
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquid/electrum-websocket/api',
};

export const BlockstreamTestnetExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorerURL: 'https://blockstream.info/liquidtestnet',
  explorerURL: 'https://blockstream.info/liquidtestnet/api',
  batchServerURL: VULPEM_ELECTRS_BATCH_TESTNET,
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api',
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  webExplorerURL: 'http://localhost:5001',
  explorerURL: 'http://localhost:3001',
  wsURL: 'ws://localhost:3001',
  websocketExplorerURL: 'ws://localhost:1234',
};

export const MempoolExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  webExplorerURL: 'https://liquid.network',
  explorerURL: 'https://liquid.network/api',
  batchServerURL: 'https://electrs-batch-mempool.vulpem.com',
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquid/electrum-websocket/api',
};

export const MempoolTestnetExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  webExplorerURL: 'https://liquid.network/testnet',
  explorerURL: 'https://liquid.network/liquidtestnet/api',
  batchServerURL: VULPEM_ELECTRS_BATCH_TESTNET,
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api',
};

/**
 * @param URLs a set of URLs describing the explorer to use
 * @returns batch server ChainAPI if batchServerURL is defined, otherwise Electrs
 */
export function explorerURLsToChainAPI(URLs: ExplorerURLs): ChainAPI {
  if (URLs.batchServerURL) {
    return ElectrsBatchServer.fromURLs(URLs.batchServerURL, URLs.explorerURL);
  }

  return Electrs.fromURL(URLs.explorerURL);
}
