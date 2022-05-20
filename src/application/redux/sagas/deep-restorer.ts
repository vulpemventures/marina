import type {
  AddressInterface,
  EsploraRestorerOpts,
  IdentityInterface,
  NetworkString,
  Restorer,
  StateRestorerOpts,
} from 'ldk';
import type { Channel } from 'redux-saga';
import { call, fork, put, take } from 'redux-saga/effects';
import type { Account, AccountID } from '../../../domain/account';
import { extractErrorMessage } from '../../../presentation/utils/error';
import { getStateRestorerOptsFromAddresses } from '../../utils/restorer';
import { RESTORE_TASK } from '../actions/action-types';
import type { RestoreTaskAction } from '../actions/task';
import { updateTaskAction } from '../actions/task';
import {
  popRestorerLoader,
  pushRestorerLoader,
  setDeepRestorerError,
  setRestorerOpts,
} from '../actions/wallet';
import { selectDeepRestorerGapLimit } from '../selectors/wallet.selector';
import type { SagaGenerator } from './utils';
import {
  createChannel,
  newSagaSelector,
  selectAccountSaga,
  selectExplorerSaga,
  selectNetworkSaga,
} from './utils';

function* getDeepRestorerSaga(
  account: Account,
  network: NetworkString
): SagaGenerator<Restorer<EsploraRestorerOpts, IdentityInterface>> {
  return yield call(() => account.getDeepRestorer(network));
}

function* restoreSaga(
  restorer: Restorer<EsploraRestorerOpts, IdentityInterface>,
  arg: EsploraRestorerOpts
): SagaGenerator<AddressInterface[]> {
  const restoreAddresses = () => restorer(arg).then((id) => id.getAddresses());
  return yield call(restoreAddresses);
}

// deep restore an account, i.e recompute addresses and try to see if they have received any transaction
// return the new StateRestorerOpts after this restoration
function* deepRestore(
  accountID: AccountID,
  gapLimit: number,
  esploraURL: string,
  net: NetworkString
): SagaGenerator<StateRestorerOpts> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) throw new Error('Account not found');

  const restorer = yield* getDeepRestorerSaga(account, net);
  const restoredAddresses = yield* restoreSaga(restorer, { gapLimit, esploraURL });
  const stateRestorerOpts = getStateRestorerOptsFromAddresses(restoredAddresses);
  return stateRestorerOpts;
}

const selectDeepRestorerGapLimitSaga = newSagaSelector(selectDeepRestorerGapLimit);

type RestoreChanData = RestoreTaskAction['payload'] & {
  gapLimit: number;
  network: NetworkString;
  esploraURL: string;
};

type RestoreChan = Channel<RestoreChanData>;

function* restorerWorker(inChan: RestoreChan): SagaGenerator<void, RestoreChanData> {
  while (true) {
    try {
      const { accountID, gapLimit, network, esploraURL } = yield take(inChan);
      yield put(pushRestorerLoader());
      const restoredIndexes = yield* deepRestore(accountID, gapLimit, esploraURL, network);
      yield put(setRestorerOpts(accountID, restoredIndexes, network)); // update state with new restorerOpts
      yield put(updateTaskAction(accountID, network)); // update utxos and transactions according to the restored addresses (on network)
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
    const esploraURL = yield* selectExplorerSaga();
    yield put(restoreTaskChan, { ...payload, gapLimit, network, esploraURL });
  }
}
