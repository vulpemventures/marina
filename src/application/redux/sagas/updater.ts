import type { NetworkString } from 'ldk';
import { getAsset } from 'ldk';
import type { AddUtxoAction } from '../actions/utxos';
import { unlockUtxos } from '../actions/utxos';
import { selectExplorerURLsSaga, newSagaSelector } from './utils';
import type { SagaGenerator } from './utils';
import { ADD_UTXO, AUTHENTICATION_SUCCESS } from '../actions/action-types';
import type { Asset } from '../../../domain/assets';
import axios from 'axios';
import type { RootReducerState } from '../../../domain/common';
import { addAsset } from '../actions/asset';
import { put, take, call, takeLatest } from 'redux-saga/effects';
import { defaultPrecision } from '../../utils/constants';
import { periodicTaxiUpdater } from '../../../background/alarms';

function* requestAssetInfoFromEsplora(
  assetHash: string,
  network: NetworkString
): SagaGenerator<Asset> {
  const explorerForNetwork = yield* selectExplorerURLsSaga(network)();
  const URL = explorerForNetwork.electrsURL;
  const getRequest = () => axios.get(`${URL}/asset/${assetHash}`).then((r) => r.data);
  const result = yield call(getRequest);

  return {
    name: result?.name ?? 'Unknown',
    ticker: result?.ticker ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}

const selectAssetSaga = (assetHash: string) =>
  newSagaSelector((state: RootReducerState) => state.assets[assetHash]);

const selectAllAssetsSaga = newSagaSelector(
  (state: RootReducerState) => new Set(Object.keys(state.assets))
);

function* needUpdate(assetHash: string): SagaGenerator<boolean> {
  const assets = yield* selectAllAssetsSaga();
  if (!assets.has(assetHash)) return true; // fetch if the asset is not in the state
  const asset = yield* selectAssetSaga(assetHash)();
  if (!asset) return true; // fetch if the asset is undefined
  if (asset.ticker === assetHash.slice(0, 4).toUpperCase()) return true; // fetch if the ticker is not in the state
  return false;
}

// watch for new utxo and fetch asset details if needed
export function* watchForAddUtxoAction(): SagaGenerator<void, AddUtxoAction> {
  while (true) {
    const action = yield take(ADD_UTXO);
    yield put(unlockUtxos());
    const assethash = getAsset(action.payload.utxo);
    if (assethash && (yield* needUpdate(assethash))) {
      try {
        const asset = yield* requestAssetInfoFromEsplora(assethash, action.payload.network);
        yield put(addAsset(assethash, asset));
      } catch (e) {
        console.warn(`Error fetching asset ${assethash}`, e);
      }
    }
  }
}

// starts an update for all accounts after each AUTHENTICATION_SUCCESS action
// only updates the accounts for the current network
export function* updateAfterEachLoginAction(): SagaGenerator<void, void> {
  yield takeLatest(AUTHENTICATION_SUCCESS, function () {
    // enable periodic updaters
    periodicTaxiUpdater();
  });
}
