import {
  AddressInterface,
  TxInterface,
  address,
  networks,
  BlindingKeyGetter,
  fetchAndUnblindTxsGenerator,
  UnblindedOutput,
  NetworkString,
  getAsset,
  getScripts,
  utxosFromTransactions,
  isUnblindedOutput,
} from 'ldk';
import {
  put,
  call,
  fork,
  all,
  take,
  AllEffect,
  StrictEffect,
  takeLatest,
} from 'redux-saga/effects';
import { buffers, Channel, channel } from '@redux-saga/core';
import { Account, AccountID } from '../../../domain/account';
import { UtxosAndTxsHistory } from '../../../domain/transaction';
import { defaultPrecision } from '../../utils';
import { addTx, AddTxAction } from '../actions/transaction';
import { SetUtxosAction, setUtxos } from '../actions/utxos';
import { selectUnspentsAndTransactions } from '../selectors/wallet.selector';
import {
  newSagaSelector,
  processAsyncGenerator,
  SagaGenerator,
  selectAccountSaga,
  selectExplorerSaga,
  selectNetworkSaga,
} from './utils';
import { ADD_TX, SET_UTXOS, UPDATE_TASK } from '../actions/action-types';
import { Asset } from '../../../domain/assets';
import axios from 'axios';
import { RootReducerState } from '../../../domain/common';
import { addAsset } from '../actions/asset';
import { UpdateTaskAction } from '../actions/updater';
import { popUpdaterLoader, pushUpdaterLoader } from '../actions/wallet';

function selectUnspentsAndTransactionsSaga(
  accountID: AccountID
): SagaGenerator<UtxosAndTxsHistory> {
  return newSagaSelector(selectUnspentsAndTransactions(accountID))();
}

const putSetUtxosAction = (accountID: AccountID) =>
  function* (utxos: UnblindedOutput[]): SagaGenerator {
    yield put(setUtxos(accountID, utxos));
  };

function* getAddressesFromAccount(account: Account): SagaGenerator<AddressInterface[]> {
  const getAddresses = () => account.getWatchIdentity().then((identity) => identity.getAddresses());
  return yield call(getAddresses);
}

const putAddTxAction = (accountID: AccountID, network: NetworkString) =>
  function* (tx: TxInterface) {
    console.log(tx.txid);
    yield put(addTx(accountID, tx, network));
  };

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* txsUpdater(accountID: AccountID): SagaGenerator<void, IteratorYieldResult<TxInterface>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const network = yield* selectNetworkSaga();
  const { transactions } = yield* selectUnspentsAndTransactionsSaga(accountID);
  const txsHistory = transactions[network] ?? {};
  const addresses = yield* getAddressesFromAccount(account);

  const identityBlindKeyGetter: BlindingKeyGetter = (script: string) => {
    try {
      const addressFromScript = address.fromOutputScript(
        Buffer.from(script, 'hex'),
        networks[network]
      );
      return addresses.find(
        (addr) =>
          address.fromConfidential(addr.confidentialAddress).unconfidentialAddress ===
          addressFromScript
      )?.blindingPrivateKey;
    } catch (_) {
      return undefined;
    }
  };

  const txsGenenerator = fetchAndUnblindTxsGenerator(
    addresses.map((a) => a.confidentialAddress),
    identityBlindKeyGetter,
    explorerURL,
    // Check if tx exists in React state, if yes: skip unblinding and fetching
    (tx) => txsHistory[tx.txid] !== undefined
  );

  yield* processAsyncGenerator<TxInterface>(
    txsGenenerator,
    putAddTxAction(accountID, network), // on next
    () => updateUnspents(accountID)
  ); // on complete
}

// wrapper for the updaterWorker
function* updateTxs(accountID: AccountID): Generator<AllEffect<any>, void, any> {
  yield all([txsUpdater(accountID)]);
}

function* createChannel<T>(): SagaGenerator<Channel<T>> {
  return yield call(channel, buffers.sliding(10));
}

function* requestAssetInfoFromEsplora(assetHash: string): SagaGenerator<Asset> {
  const explorerURL = yield* selectExplorerSaga();
  const getRequest = () => axios.get(`${explorerURL}/asset/${assetHash}`).then((r) => r.data);
  const result = yield call(getRequest);

  return {
    name: result?.name ?? 'Unknown',
    ticker: result?.ticker ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}

function* updaterWorker(chanToListen: Channel<AccountID>): SagaGenerator<void, AccountID> {
  while (true) {
    const accountID = yield take(chanToListen);
    try {
      yield put(pushUpdaterLoader());
      yield* updateTxs(accountID);
    } finally {
      yield put(popUpdaterLoader());
    }
  }
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

function* assetsWorker(assetsChan: Channel<string>): SagaGenerator<void, string> {
  while (true) {
    const assetHashFromUpdater = yield take(assetsChan);
    if (yield* needUpdate(assetHashFromUpdater)) {
      try {
        const asset = yield* requestAssetInfoFromEsplora(assetHashFromUpdater);
        yield put(addAsset(assetHashFromUpdater, asset));
      } catch (e) {
        console.warn(`Error fetching asset ${assetHashFromUpdater}`, e);
      }
    }
  }
}

function* watchForSetUtxosAction(chan: Channel<string>): SagaGenerator<void, SetUtxosAction> {
  while (true) {
    const action = yield take(SET_UTXOS);
    for (const u of action.payload.utxos) {
      const asset = getAsset(u);
      if (asset) {
        yield put(chan, asset);
      }
    }
  }
}

function* updateUnspents(accountID: AccountID): SagaGenerator<void, StrictEffect> {
  const { transactions } = yield* selectUnspentsAndTransactionsSaga(accountID);
  const network = yield* selectNetworkSaga();
  const account = yield* selectAccountSaga(accountID);
  if (!account) return; // skip if account is not found
  const addresses = yield* getAddressesFromAccount(account);
  const walletScripts = getScripts(addresses);
  const txs = Object.values(transactions[network]);

  const utxos = utxosFromTransactions(txs, walletScripts);
  yield* putSetUtxosAction(accountID)(utxos.filter(isUnblindedOutput));
}

function* watchForAddTx(): SagaGenerator<void> {
  // takeLatest ensures that we get the latest tx state to compute utxos
  yield takeLatest(ADD_TX, function* (action: AddTxAction) {
    const { accountID } = action.payload;
    yield* updateUnspents(accountID);
  });
}

// starts a set of workers in order to handle asynchronously the UPDATE_TASK action
export function* watchUpdateTask(): SagaGenerator<void, UpdateTaskAction> {
  const MAX_UPDATER_WORKERS = 3;
  const accountToUpdateChan = yield* createChannel<AccountID>();

  for (let i = 0; i < MAX_UPDATER_WORKERS; i++) {
    yield fork(updaterWorker, accountToUpdateChan);
  }

  // start the asset updater
  const assetsHashChan = yield* createChannel<string>();
  yield fork(assetsWorker, assetsHashChan);
  yield fork(watchForSetUtxosAction, assetsHashChan); // this will feed the assets chan

  yield fork(watchForAddTx);

  // listen for UPDATE_TASK
  while (true) {
    const { payload } = yield take(UPDATE_TASK);
    yield put(accountToUpdateChan, payload);
  }
}
