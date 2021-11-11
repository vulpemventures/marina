import { UtxoInterface } from 'ldk';
import { AnyAction } from 'redux';
import { AccountID } from '../../../domain/account';
import { ActionWithPayload } from '../../../domain/common';
import { ADD_UTXO, DELETE_UTXO, FLUSH_UTXOS } from './action-types';

export type AddUtxoAction = ActionWithPayload<{ accountID: AccountID, utxo: UtxoInterface }>;

export function addUtxo(accountID: AccountID, utxo: UtxoInterface): AddUtxoAction {
  return { type: ADD_UTXO, payload: { accountID, utxo } };
}

export function deleteUtxo(accountID: AccountID, txid: string, vout: number): AnyAction {
  return { type: DELETE_UTXO, payload: { txid, vout, accountID } };
}

export function flushUtxos(accountID: AccountID): AnyAction {
  return { type: FLUSH_UTXOS, payload: { accountID } };
}
