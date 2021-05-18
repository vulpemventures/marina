import { AnyAction } from "redux";
import { UPDATE_UTXOS } from "./action-types";

export function launchUtxosUpdater(): AnyAction {
  return { type: UPDATE_UTXOS }
}
