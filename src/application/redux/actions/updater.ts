import { AccountID } from '../../../domain/account';
import { ActionWithPayload } from '../../../domain/common';
import { UPDATE_TASK } from './action-types';

export type UpdateTaskAction = ActionWithPayload<AccountID>;

export const updateTaskAction = (accountID: AccountID): UpdateTaskAction => ({
  type: UPDATE_TASK,
  payload: accountID,
});
