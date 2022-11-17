import type {
  AddressInterface,
  IdentityInterface,
  NetworkString,
  Restorer,
  StateRestorerOpts,
} from 'ldk';
import type { Channel } from 'redux-saga';
import { call, fork, put, take } from 'redux-saga/effects';
import type { ChainAPIRestorerOpts, MnemonicAccount } from '../../../domain/account';
import { AccountType } from '../../../domain/account';
import { extractErrorMessage } from '../../../presentation/utils/error';
import { getStateRestorerOptsFromAddresses } from '../../utils/restorer';
import { RESTORE_TASK } from '../actions/action-types';
import type { RestoreTaskAction } from '../actions/task';
import {
  popRestorerLoader,
  pushRestorerLoader,
  setDeepRestorerError,
  setRestorerOpts,
} from '../actions/wallet';
import { selectDeepRestorerGapLimit } from '../selectors/wallet.selector';
import type { SagaGenerator } from './utils';
import {
  selectChainAPI,
  createChannel,
  newSagaSelector,
  selectAccountSaga,
  selectNetworkSaga,
} from './utils';

function* getDeepRestorerSaga(
  account: MnemonicAccount,
  network: NetworkString
): SagaGenerator<Restorer<ChainAPIRestorerOpts, IdentityInterface>> {
  return yield call(() => account.getDeepRestorer(network));
}

function* restoreSaga(
  restorer: Restorer<ChainAPIRestorerOpts, IdentityInterface>,
  gapLimit: number,
  network: NetworkString
): SagaGenerator<AddressInterface[]> {
  const api = yield* selectChainAPI(network);
  const restoreAddresses = () => restorer({ api, gapLimit }).then((id) => id.getAddresses());
  return yield call(restoreAddresses);
}

// deep restore an account, i.e recompute addresses and try to see if they have received any transaction
// return the new StateRestorerOpts after this restoration
function* deepRestore(
  account: MnemonicAccount,
  gapLimit: number,
  net: NetworkString
): SagaGenerator<StateRestorerOpts> {
  const restorer = yield* getDeepRestorerSaga(account, net);
  const restoredAddresses = yield* restoreSaga(restorer, gapLimit, net);
  const stateRestorerOpts = getStateRestorerOptsFromAddresses(restoredAddresses);
  return stateRestorerOpts;
}

const selectDeepRestorerGapLimitSaga = newSagaSelector(selectDeepRestorerGapLimit);

type RestoreChanData = RestoreTaskAction['payload'] & {
  gapLimit: number;
  network: NetworkString;
};

type RestoreChan = Channel<RestoreChanData>;

function* restorerWorker(inChan: RestoreChan): SagaGenerator<void, RestoreChanData> {
  while (true) {
    try {
      const { accountID, gapLimit, network } = yield take(inChan);
      yield put(pushRestorerLoader());
      const account = yield* selectAccountSaga(accountID);
      if (!account) throw new Error('Account not found');
      if (account.type === AccountType.MainAccount) {
        const restoredIndexes = yield* deepRestore(account as MnemonicAccount, gapLimit, network);
        yield put(setRestorerOpts(accountID, restoredIndexes, network)); // update state with new restorerOpts
      }
    } catch (error) {
      yield put(
        setDeepRestorerError(new Error(`deep restore error: ${extractErrorMessage(error)}`))
      );
    } finally {
      yield put(popRestorerLoader());
    }
  }
}

const MAX_RESTORER_WORKERS = 3; // how many tasks can be processed at the same time

// watch for each RESTORE_TASK action
export function* watchRestoreTask(): SagaGenerator<void, RestoreTaskAction> {
  const restoreTaskChan = yield* createChannel<RestoreChanData>();
  for (let i = 0; i < MAX_RESTORER_WORKERS; i++) {
    yield fork(restorerWorker, restoreTaskChan);
  }

  // listen for RESTORE_TASK action, and send it to the restoreTaskChan (workers will handle it)
  while (true) {
    const { payload } = yield take<RestoreTaskAction>(RESTORE_TASK);
    const gapLimit = yield* selectDeepRestorerGapLimitSaga();
    const network = yield* selectNetworkSaga();
    yield put(restoreTaskChan, { ...payload, gapLimit, network });
  }
}
