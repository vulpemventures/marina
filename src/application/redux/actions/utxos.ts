import type { NetworkString, UnblindedOutput } from 'ldk';
import type { AnyAction } from 'redux';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';
import { ADD_UTXO, DELETE_UTXO, FLUSH_UTXOS } from './action-types';

export type AddUtxoAction = ActionWithPayload<{
  accountID: AccountID;
  utxo: UnblindedOutput;
  network: NetworkString;
}>;

export function addUtxo(
  accountID: AccountID,
  utxo: UnblindedOutput,
  network: NetworkString
): AddUtxoAction {
  return { type: ADD_UTXO, payload: { accountID, utxo, network } };
}

export function deleteUtxo(
  accountID: AccountID,
  txid: string,
  vout: number,
  network: NetworkString
): AnyAction {
  return { type: DELETE_UTXO, payload: { txid, vout, accountID, network } };
}

export function flushUtxos(accountID: AccountID, network: NetworkString): AnyAction {
  return { type: FLUSH_UTXOS, payload: { accountID, network } };
}
