import { AccountID } from '../../../domain/account';
import { UpdaterTaskType } from '../reducers/updater-reducer';
import { PUSH_UPDATER_TASK } from './action-types';

export function utxosUpdateTask(accountID: AccountID) {
  return {
    type: PUSH_UPDATER_TASK,
    payload: {
      updaterTask: {
        accountID,
        type: UpdaterTaskType.UTXO,
      },
    },
  };
}

export function txsUpdateTask(accountID: AccountID) {
  return {
    type: PUSH_UPDATER_TASK,
    payload: {
      updaterTask: {
        accountID,
        type: UpdaterTaskType.TX,
      },
    },
  };
}
