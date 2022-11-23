import type { ChainAPI, NetworkString } from 'ldk';
import { Electrs, ElectrsBatchServer } from 'ldk';
import type { ExplorerURLs } from '../../../domain/app';
import { appInitState } from '../reducers/app-reducer';
import type { RootReducerState } from './../../../domain/common';

export function selectExplorerURLs(net?: NetworkString) {
  return (state: RootReducerState): ExplorerURLs => {
    return (
      state.app.explorerByNetwork[net ?? state.app.network] ??
      appInitState.explorerByNetwork[net ?? state.app.network]
    );
  };
}

export const selectEsploraForNetwork = (network: NetworkString) =>
  function (state: RootReducerState): string {
    return selectExplorerURLs(network)(state).explorerURL;
  };

export function selectHTTPExplorerURL(net?: NetworkString) {
  return function (state: RootReducerState): string {
    return selectExplorerURLs(net)(state).explorerURL;
  };
}

export function selectWebExplorerURL(net?: NetworkString) {
  return function (state: RootReducerState): string {
    return selectExplorerURLs(net)(state).webExplorerURL;
  };
}

export function selectNetwork(state: RootReducerState) {
  return state.app.network;
}

export function selectWSExplorerURL(network?: NetworkString) {
  return function (state: RootReducerState): string {
    return selectExplorerURLs(network)(state).websocketExplorerURL;
  };
}

/**
 * @param URLs a set of URLs describing the explorer to use
 * @returns batch server ChainAPI if batchServerURL is defined, otherwise Electrs
 */
function explorerURLsToChainAPI(URLs: ExplorerURLs): ChainAPI {
  if (URLs.batchServerURL) {
    return ElectrsBatchServer.fromURLs(URLs.batchServerURL, URLs.explorerURL);
  }

  return Electrs.fromURL(URLs.explorerURL);
}

export function selectChainAPI(net?: NetworkString) {
  return function (state: RootReducerState): ChainAPI {
    const explorerURLs = selectExplorerURLs(net)(state);
    return explorerURLsToChainAPI(explorerURLs);
  };
}
