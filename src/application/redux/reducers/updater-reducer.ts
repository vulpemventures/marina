import { AnyAction } from 'redux';
import { AccountID } from '../../../domain/account';
import { POP_UPDATER_TASK, PUSH_UPDATER_TASK } from '../actions/action-types';

export enum UpdaterTaskType {
  TX = 0,
  UTXO,
}

export interface UpdaterTask {
  accountID: AccountID;
  type: UpdaterTaskType;
}

export interface UpdaterState {
  stack: UpdaterTask[];
}

export function updaterReducer(
  state: UpdaterState = { stack: [] },
  { type, payload }: AnyAction
): UpdaterState {
  switch (type) {
    case PUSH_UPDATER_TASK: {
      if (payload.updaterTask) return { ...state, stack: [...state.stack, payload.updaterTask] };
      return state;
    }

    case POP_UPDATER_TASK: {
      return { ...state, stack: state.stack.slice(0, -1) };
    }

    default:
      return state;
  }
}
