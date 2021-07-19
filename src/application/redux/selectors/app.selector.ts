import { RootReducerState } from './../../../domain/common';

export function getExplorerURLSelector(state: RootReducerState) {
  return state.app.explorerByNetwork[state.app.network].explorer;
}
