import {
  call,
  put,
  takeLeading,
  fork,
  all,
  take,
  cancel,
  delay,
  AllEffect,
} from 'redux-saga/effects';
import { fetchAssetsFromTaxi, taxiURL } from '../../utils/taxi';
import {
  RESET,
  RESET_APP,
  RESET_CONNECT,
  RESET_TAXI,
  RESET_WALLET,
  START_PERIODIC_UPDATE,
  STOP_PERIODIC_UPDATE,
  UPDATE_TAXI_ASSETS,
} from '../actions/action-types';
import { setTaxiAssets } from '../actions/taxi';
import { selectTaxiAssets } from '../selectors/taxi.selector';
import { updateTaskAction } from '../actions/updater';
import {
  newSagaSelector,
  SagaGenerator,
  selectAllAccountsIDsSaga,
  selectNetworkSaga,
  selectUpdaterIsLoadingSaga,
} from './utils';
import { watchUpdateTask } from './updater';
import { watchStartDeepRestorer } from './deep-restorer';
import { Task } from 'redux-saga';

const selectTaxiAssetsSaga = newSagaSelector(selectTaxiAssets);

function* fetchAndSetTaxiAssets(): SagaGenerator<void, string[]> {
  try {
    const network = yield* selectNetworkSaga();
    const assets = yield call(fetchAssetsFromTaxi, taxiURL[network]);
    const currentTaxiAssets = yield* selectTaxiAssetsSaga();
    const sortAndJoin = (a: string[]) => a.sort().join('');
    if (sortAndJoin(assets) !== sortAndJoin(currentTaxiAssets)) {
      yield put(setTaxiAssets(assets));
    }
  } catch (err: unknown) {
    console.warn(`fetch taxi assets error: ${(err as Error).message || 'unknown'}`);
    // ignore errors
  }
}

// watch for every UPDATE_TAXI_ASSETS actions
// wait that previous update is done before begin the new one
function* watchUpdateTaxi(): SagaGenerator<void, void> {
  yield takeLeading(UPDATE_TAXI_ASSETS, fetchAndSetTaxiAssets);
}

function newPeriodicSagaTask(task: () => SagaGenerator, intervalMs: number) {
  return function* (): SagaGenerator<void, void> {
    while (true) {
      yield* task();
      console.log('periodic task done');
      yield delay(intervalMs);
    }
  };
}

function* dispatchUpdateTaskForAllAccountsIDs(): SagaGenerator<void, void> {
  const isUpdating = yield* selectUpdaterIsLoadingSaga();
  if (isUpdating) return; // skip if any updater worker is already running
  const accountIDs = yield* selectAllAccountsIDsSaga();
  const network = yield* selectNetworkSaga();
  yield all(accountIDs.map((id) => put(updateTaskAction(id, network))));
}

const periodicUpdaterSaga = newPeriodicSagaTask(dispatchUpdateTaskForAllAccountsIDs, 60_000);
const periodicTaxiUpdateSaga = newPeriodicSagaTask(fetchAndSetTaxiAssets, 120_000);

// watch for every START_PERIODIC_UPDATE actions
// and starts periodic tasks for all accounts + taxi
function* watchPeriodicUpdater(): SagaGenerator<void, Task> {
  while (yield take(START_PERIODIC_UPDATE)) {
    const periodicUpdateTask = yield fork(periodicUpdaterSaga);
    const periodicTaxiUpdateTask = yield fork(periodicTaxiUpdateSaga);
    yield take(STOP_PERIODIC_UPDATE);
    yield cancel(periodicUpdateTask);
    yield cancel(periodicTaxiUpdateTask);
  }
}

function* reset(): Generator<AllEffect<any>> {
  const actionsTypes = [RESET_APP, RESET_WALLET, RESET_CONNECT, RESET_TAXI];
  yield all(actionsTypes.map((type) => put({ type })));
}

// watch for every RESET actions
// run reset saga in order to clean the redux state
function* watchReset(): SagaGenerator<void, void> {
  yield takeLeading(RESET, reset);
}

function* mainSaga(): SagaGenerator<void, void> {
  yield fork(watchReset);
  yield fork(watchUpdateTaxi);
  yield fork(watchUpdateTask);
  yield fork(watchPeriodicUpdater);
  yield fork(watchStartDeepRestorer);
}

export default mainSaga;
