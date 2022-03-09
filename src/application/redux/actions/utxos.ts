import { NetworkString, UnblindedOutput } from 'ldk';
import { AnyAction } from 'redux';
import { AccountID } from '../../../domain/account';
import { ActionWithPayload } from '../../../domain/common';
import { UnconfirmedOutput } from '../../../domain/unconfirmed';
import { makeUnconfirmedUtxos } from '../../utils/utxos';
import {
  ADD_UTXO,
  DELETE_UTXO,
  FLUSH_UTXOS,
  LOCK_UTXO,
  ADD_UNCONFIRMED_UTXOS,
  UNLOCK_UTXOS,
} from './action-types';

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

export function lockUtxo(utxo: UnblindedOutput): AnyAction {
  return { type: LOCK_UTXO, payload: { utxo } };
}

export function unlockUtxos(): AnyAction {
  return { type: UNLOCK_UTXOS, payload: {} };
}

export async function addUnconfirmedUtxos(
  txHex: string,
  unconfirmedOutputs: UnconfirmedOutput[],
  accountID: AccountID,
  network: NetworkString
): Promise<AnyAction> {
  const unconfirmedUtxos = await makeUnconfirmedUtxos(txHex, unconfirmedOutputs);
  console.debug('add unconfirmedUtxos', unconfirmedUtxos);
  return {
    type: ADD_UNCONFIRMED_UTXOS,
    payload: { unconfirmedUtxos, accountID, network },
  };
}
