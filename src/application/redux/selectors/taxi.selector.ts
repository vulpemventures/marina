import { RootReducerState } from "../../../domain/common";

export function selectTaxiAssets(state: RootReducerState): string[] {
  return state.taxi.taxiAssets;
}