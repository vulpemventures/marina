import { createSelector } from 'reselect';
import { NetworkType } from '../../../domain/network';
import { lbtcAssetByNetwork } from '../../utils';
import { RootReducerState } from './../../../domain/common';

export function getExplorerURLSelector(state: RootReducerState) {
  return state.app.explorerByNetwork[state.app.network].esploraURL;
}

export const selectLBTCforNetwork = createSelector(
  [(state: RootReducerState) => state.app.network],
  (network: NetworkType) => lbtcAssetByNetwork(network)
);
