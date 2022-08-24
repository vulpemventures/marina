import type { NetworkString } from 'ldk';
import type { ExplorerURLs } from '../../../domain/app';
import { appInitState } from '../reducers/app-reducer';
import type { RootReducerState } from './../../../domain/common';

export function selectExplorerURLs(state: RootReducerState, net?: NetworkString): ExplorerURLs {
  return (
    state.app.explorerByNetwork[net ?? state.app.network] ??
    appInitState.explorerByNetwork[net ?? state.app.network]
  );
}

export const selectEsploraForNetwork = (network: NetworkString) =>
  function (state: RootReducerState): string {
    return selectExplorerURLs(state, network).esploraURL;
  };

export function selectEsploraURL(state: RootReducerState): string {
  return selectExplorerURLs(state).esploraURL;
}

export function selectElectrsURL(state: RootReducerState): string {
  return selectExplorerURLs(state).electrsURL;
}

export function selectNetwork(state: RootReducerState) {
  return state.app.network;
}
