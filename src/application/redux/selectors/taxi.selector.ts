import type { NetworkString } from 'ldk';
import type { RootReducerState } from '../../../domain/common';

export function selectTaxiAssets(state: RootReducerState): string[] {
  return state.taxi.taxiAssets[state.app.network];
}

export function selectTaxiAssetsForNetwork(net: NetworkString) {
  return (state: RootReducerState) => state.taxi.taxiAssets[net];
}
