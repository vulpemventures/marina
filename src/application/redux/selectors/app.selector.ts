import { ExplorerURLs } from '../../../domain/app';
import { appInitState } from '../reducers/app-reducer';
import { RootReducerState } from './../../../domain/common';

function getExplorerURLSelector(state: RootReducerState): ExplorerURLs {
  return (
    state.app.explorerByNetwork[state.app.network] ??
    appInitState.explorerByNetwork[state.app.network]
  );
}

export function selectEsploraURL(state: RootReducerState): string {
  return getExplorerURLSelector(state).esploraURL;
}

export function selectElectrsURL(state: RootReducerState): string {
  return getExplorerURLSelector(state).electrsURL;
}
