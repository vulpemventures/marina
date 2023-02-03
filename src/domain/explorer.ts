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
  websocketExplorerURL: 'wss://blockstream.info/liquid/electrum-websocket/api',
};

export const BlockstreamTestnetExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorerURL: 'https://blockstream.info/liquidtestnet',
  explorerURL: 'https://blockstream.info/liquidtestnet/api',
  batchServerURL: VULPEM_ELECTRS_BATCH_TESTNET,
  websocketExplorerURL: 'wss://blockstream.info/liquidtestnet/electrum-websocket/api',
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  webExplorerURL: 'http://localhost:5001',
  explorerURL: 'http://localhost:3001',
  wsURL: 'ws://localhost:3001',
  websocketExplorerURL: 'ws://127.0.0.1:1234',
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
