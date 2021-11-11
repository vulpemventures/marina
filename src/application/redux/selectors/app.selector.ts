import { RootReducerState } from './../../../domain/common';

export function getExplorerURLSelector(state: RootReducerState) {
  return state.app.explorerByNetwork[state.app.network].esploraURL;
}

export function selectNetwork(state: RootReducerState) {
  return state.app.network;
}
