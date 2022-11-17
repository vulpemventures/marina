import type { NetworkString } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';
import { FETCH_TX_TASK, RESTORE_TASK, UPDATE_SCRIPT_TASK } from './action-types';

export type UpdateTaskAction = ActionWithPayload<{ accountID: AccountID; network: NetworkString }>;
export type UpdateScriptTaskAction = ActionWithPayload<{
  scripthash: string;
  unspentState: Array<{ height: number; tx_hash: string; tx_pos: number }>;
  network: NetworkString;
}>;
export type FetchTxTaskAction = ActionWithPayload<{
  txid: string;
  network: NetworkString;
  accountID: AccountID;
  startAt: number;
}>;
export type RestoreTaskAction = ActionWithPayload<{ accountID: AccountID }>;

export const restoreTaskAction = (accountID: AccountID): RestoreTaskAction => ({
  type: RESTORE_TASK,
  payload: { accountID },
});

export const updateScriptTaskAction = (
  scripthash: string,
  unspentsResponse: Array<{ height: number; tx_hash: string; tx_pos: number }>,
  network: NetworkString
): UpdateScriptTaskAction => ({
  type: UPDATE_SCRIPT_TASK,
  payload: { scripthash, unspentState: unspentsResponse, network },
});

export const fetchTxTaskAction = (
  txid: string,
  accountID: AccountID,
  network: NetworkString,
  startAt: number = Date.now()
): FetchTxTaskAction => ({
  type: FETCH_TX_TASK,
  payload: { txid, accountID, network, startAt },
});
