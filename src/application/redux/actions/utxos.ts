import { UnblindedOutput } from 'ldk';
import { AccountID } from '../../../domain/account';
import { ActionWithPayload } from '../../../domain/common';
import { SET_UTXOS } from './action-types';

export type SetUtxosAction = ActionWithPayload<{ accountID: AccountID; utxos: UnblindedOutput[] }>;

export function setUtxos(accountID: AccountID, utxos: UnblindedOutput[]): SetUtxosAction {
  return { type: SET_UTXOS, payload: { accountID, utxos } };
}

export function flushUtxos(accountID: AccountID): SetUtxosAction {
  return { type: SET_UTXOS, payload: { accountID, utxos: [] } };
}
