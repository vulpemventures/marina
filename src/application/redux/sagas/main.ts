import { call, put, takeLeading, fork, all, AllEffect } from 'redux-saga/effects';
import { fetchAssetsFromTaxi, taxiURL } from '../../utils/taxi';
import {
  RESET,
  RESET_APP,
  RESET_CONNECT,
  RESET_TAXI,
  RESET_WALLET,
  UPDATE_TAXI_ASSETS,
} from '../actions/action-types';
import { setTaxiAssets } from '../actions/taxi';
import { selectTaxiAssets } from '../selectors/taxi.selector';
import { newSagaSelector, SagaGenerator, selectNetworkSaga } from './utils';
import { updateAfterEachLoginAction, watchUpdateTask } from './updater';
import { watchStartDeepRestorer } from './deep-restorer';

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
  yield fork(updateAfterEachLoginAction);
  yield fork(watchStartDeepRestorer);
}

export default mainSaga;
