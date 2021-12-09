import {
  Outpoint,
  fetchAndUnblindUtxosGenerator,
  AddressInterface,
  TxInterface,
  address,
  networks,
  BlindingKeyGetter,
  fetchAndUnblindTxsGenerator,
  UnblindedOutput,
  NetworkString,
  getAsset,
} from 'ldk';
import { put, call, fork, all, take, AllEffect } from 'redux-saga/effects';
import { buffers, Channel, channel } from '@redux-saga/core';
import { Account, AccountID } from '../../../domain/account';
import { UtxosAndTxsHistory } from '../../../domain/transaction';
import { defaultPrecision, toDisplayTransaction, toStringOutpoint } from '../../utils';
import { addTx } from '../actions/transaction';
import { addUtxo, AddUtxoAction, deleteUtxo } from '../actions/utxos';
import { selectUnspentsAndTransactions } from '../selectors/wallet.selector';
import {
  newSagaSelector,
  processAsyncGenerator,
  SagaGenerator,
  selectAccountSaga,
  selectExplorerSaga,
  selectNetworkSaga,
} from './utils';
import { ADD_UTXO, UPDATE_TASK } from '../actions/action-types';
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

const putAddUtxoAction = (accountID: AccountID) =>
  function* (utxo: UnblindedOutput): SagaGenerator {
    yield put(addUtxo(accountID, utxo));
  };

const putDeleteUtxoAction = (accountID: AccountID) =>
  function* (outpoint: Outpoint): SagaGenerator {
    yield put(deleteUtxo(accountID, outpoint.txid, outpoint.vout));
  };

function* getAddressesFromAccount(account: Account): SagaGenerator<AddressInterface[]> {
  const getAddresses = () => account.getWatchIdentity().then((identity) => identity.getAddresses());
  return yield call(getAddresses);
}

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* utxosUpdater(
  accountID: AccountID
): SagaGenerator<void, IteratorYieldResult<UnblindedOutput>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID);
  const utxosMap = utxosTransactionsState.utxosMap ?? {};
  const addresses = yield* getAddressesFromAccount(account);
  const skippedOutpoints: string[] = []; // for deleting
  const utxosGenerator = fetchAndUnblindUtxosGenerator(addresses, explorerURL, (utxo) => {
    const outpoint = toStringOutpoint(utxo);
    const skip = utxosMap[outpoint] !== undefined;
    if (skip) skippedOutpoints.push(toStringOutpoint(utxo));
    return skip;
  });
  yield* processAsyncGenerator<UnblindedOutput>(utxosGenerator, putAddUtxoAction(accountID));

  const toDelete = Object.values(utxosMap).filter(
    (utxo) => !skippedOutpoints.includes(toStringOutpoint(utxo))
  );

  for (const utxo of toDelete) {
    yield* putDeleteUtxoAction(accountID)(utxo);
  }
}

const putAddTxAction = (accountID: AccountID, network: NetworkString, walletScripts: string[]) =>
  function* (tx: TxInterface) {
    yield put(
      addTx(accountID, toDisplayTransaction(tx, walletScripts, networks[network]), network)
    );
  };

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* txsUpdater(accountID: AccountID): SagaGenerator<void, IteratorYieldResult<TxInterface>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const network = yield* selectNetworkSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID);
  const txsHistory = utxosTransactionsState.transactions[network] ?? {};
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

  const walletScripts = addresses.map((a) =>
    address.toOutputScript(a.confidentialAddress).toString('hex')
  );

  yield* processAsyncGenerator<TxInterface>(
    txsGenenerator,
    putAddTxAction(accountID, network, walletScripts)
  );
}

function* updateTxsAndUtxos(accountID: AccountID): Generator<AllEffect<any>, void, any> {
  yield all([txsUpdater(accountID), utxosUpdater(accountID)]);
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
    ticker: result?.name ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}

function* updaterWorker(chanToListen: Channel<AccountID>): SagaGenerator<void, AccountID> {
  while (true) {
    const accountID = yield take(chanToListen);
    try {
      yield put(pushUpdaterLoader())
      yield* updateTxsAndUtxos(accountID);
    } finally {
      yield put(popUpdaterLoader())
    }
  }
}

const selectAllAssetsSaga = newSagaSelector(
  (state: RootReducerState) => new Set(Object.keys(state.assets))
);

function* assetsWorker(assetsChan: Channel<string>): SagaGenerator<void, string> {
  while (true) {
    const assetHashFromUpdater = yield take(assetsChan);
    const assets = yield* selectAllAssetsSaga();
    if (!assets.has(assetHashFromUpdater)) {
      const asset = yield* requestAssetInfoFromEsplora(assetHashFromUpdater);
      yield put(addAsset(assetHashFromUpdater, asset));
    }
  }
}

export function* watchForAddUtxoAction(chan: Channel<string>): SagaGenerator<void, AddUtxoAction> {
  while (true) {
    const action = yield take(ADD_UTXO);
    const asset = getAsset(action.payload.utxo);
    if (asset) {
      yield put(chan, asset);
    }
  }
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
  yield fork(watchForAddUtxoAction, assetsHashChan); // this will fee the assets chan

  // listen for UPDATE_TASK
  while (true) {
    const { payload } = yield take(UPDATE_TASK);
    yield put(accountToUpdateChan, payload);
  }
}
