import type { NetworkString } from 'ldk';
import type { AccountID } from '../../../domain/account';
import type { ActionWithPayload } from '../../../domain/common';
import { RESTORE_TASK, UPDATE_TASK } from './action-types';

export type UpdateTaskAction = ActionWithPayload<{ accountID: AccountID; network: NetworkString }>;
export type RestoreTaskAction = ActionWithPayload<{ accountID: AccountID }>;

export const updateTaskAction = (
  accountID: AccountID,
  network: NetworkString
): UpdateTaskAction => ({
  type: UPDATE_TASK,
  payload: { accountID, network },
});

export const restoreTaskAction = (accountID: AccountID): RestoreTaskAction => ({
  type: RESTORE_TASK,
  payload: { accountID },
});
