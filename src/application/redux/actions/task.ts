import type { NetworkString } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';
import { RESTORE_TASK, UPDATE_SCRIPT_TASK } from './action-types';

export type UpdateTaskAction = ActionWithPayload<{ accountID: AccountID; network: NetworkString }>;
export type UpdateScriptTaskAction = ActionWithPayload<{ scripthash: string; unspentState: Array<{ height: number, tx_hash: string, tx_pos: number }>; network: NetworkString }>;
export type RestoreTaskAction = ActionWithPayload<{ accountID: AccountID }>;

export const restoreTaskAction = (accountID: AccountID): RestoreTaskAction => ({
  type: RESTORE_TASK,
  payload: { accountID },
});

export const updateScriptTaskAction = (scripthash: string, unspentsResponse: Array<{ height: number, tx_hash: string, tx_pos: number }>, network: NetworkString): UpdateScriptTaskAction => ({
  type: UPDATE_SCRIPT_TASK,
  payload: { scripthash, unspentState: unspentsResponse, network },
});