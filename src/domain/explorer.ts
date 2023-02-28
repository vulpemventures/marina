export type ExplorerType = 'Blockstream' | 'Testnet' | 'Mempool' | 'Nigiri' | 'Custom';

export interface ExplorerURLs {
  type: ExplorerType;
  webExplorerURL: string;
  websocketExplorerURL: string; // ws:// or wss:// endpoint
}

export const BlockstreamExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorerURL: 'https://blockstream.info/liquid',
  websocketExplorerURL: 'wss://blockstream.info/liquid/electrum-websocket/api',
};

export const BlockstreamTestnetExplorerURLs: ExplorerURLs = {
  type: 'Blockstream',
  webExplorerURL: 'https://blockstream.info/liquidtestnet',
  websocketExplorerURL: 'wss://blockstream.info/liquidtestnet/electrum-websocket/api',
};

export const NigiriDefaultExplorerURLs: ExplorerURLs = {
  type: 'Nigiri',
  webExplorerURL: 'http://localhost:5001',
  websocketExplorerURL: 'ws://127.0.0.1:1234',
};

export const MempoolExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  webExplorerURL: 'https://liquid.network',
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquid/electrum-websocket/api',
};

export const MempoolTestnetExplorerURLs: ExplorerURLs = {
  type: 'Mempool',
  webExplorerURL: 'https://liquid.network/testnet',
  websocketExplorerURL: 'wss://esplora.blockstream.com/liquidtestnet/electrum-websocket/api',
};

export function isMempoolWebExplorerURL(webExplorerURL: string): boolean {
  return webExplorerURL.includes('liquid.network');
}

export function isBlockstreamWebExplorerURL(webExplorerURL: string): boolean {
  return webExplorerURL.includes('blockstream.info');
}

export function isNigiriWebExplorerURL(webExplorerURL: string): boolean {
  return webExplorerURL === NigiriDefaultExplorerURLs.webExplorerURL;
}
