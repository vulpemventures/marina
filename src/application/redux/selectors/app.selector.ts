import type { NetworkString } from 'ldk';
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
