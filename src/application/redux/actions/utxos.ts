import { UtxoInterface } from 'ldk';
import { AnyAction } from 'redux';
import { ADD_UTXO, DELETE_UTXO, FLUSH_UTXOS, UPDATE_UTXOS } from './action-types';

export function updateUtxos(): AnyAction {
  return { type: UPDATE_UTXOS };
}

export function addUtxo(utxo: UtxoInterface): AnyAction {
  return { type: ADD_UTXO, payload: { utxo } };
}

export function deleteUtxo(txid: string, vout: number): AnyAction {
  return { type: DELETE_UTXO, payload: { txid, vout } };
}

export function flushUtxos(): AnyAction {
  return { type: FLUSH_UTXOS }
}