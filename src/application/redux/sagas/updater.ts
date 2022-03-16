import type {
  Outpoint,
  AddressInterface,
  TxInterface,
  BlindingKeyGetter,
  UnblindedOutput,
  NetworkString,
  Output,
} from 'ldk';
import {
  fetchAndUnblindUtxosGenerator,
  address,
  networks,
  fetchAndUnblindTxsGenerator,
  getAsset,
} from 'ldk';
import type { Account, AccountID } from '../../../domain/account';
import type { UtxosAndTxs } from '../../../domain/transaction';
import { addTx } from '../actions/transaction';
import type { AddUtxoAction } from '../actions/utxos';
import { addUtxo, deleteUtxo } from '../actions/utxos';
import { selectUnspentsAndTransactions } from '../selectors/wallet.selector';
import type { SagaGenerator } from './utils';
import {
  createChannel,
  newSagaSelector,
  processAsyncGenerator,
  selectAccountSaga,
  selectAllAccountsIDsSaga,
  selectAllUnspentsSaga,
  selectExplorerSaga,
  selectNetworkSaga,
} from './utils';
import { ADD_UTXO, UPDATE_TASK, AUTHENTICATION_SUCCESS } from '../actions/action-types';
import type { Asset } from '../../../domain/assets';
import axios from 'axios';
import type { RootReducerState } from '../../../domain/common';
import { addAsset } from '../actions/asset';
import type { UpdateTaskAction } from '../actions/updater';
import { updateTaskAction } from '../actions/updater';
import { popUpdaterLoader, pushUpdaterLoader } from '../actions/wallet';
import type { Channel } from 'redux-saga';
import type { AllEffect } from 'redux-saga/effects';
import { put, all, take, fork, call, takeLatest } from 'redux-saga/effects';
import { toStringOutpoint } from '../../utils/utxos';
import { toDisplayTransaction } from '../../utils/transaction';
import { defaultPrecision } from '../../utils/constants';
import { updateTaxiAssets } from '../actions/taxi';
import { periodicTaxiUpdater, periodicUpdater } from '../../../background/alarms';

function selectUnspentsAndTransactionsSaga(
  accountID: AccountID,
  network: NetworkString
): SagaGenerator<UtxosAndTxs | undefined> {
  return newSagaSelector(selectUnspentsAndTransactions(accountID, network))();
}

const putAddUtxoAction = (accountID: AccountID, net: NetworkString) =>
  function* (utxo: UnblindedOutput): SagaGenerator {
    yield put(addUtxo(accountID, utxo, net));
  };

const putDeleteUtxoAction = (accountID: AccountID, net: NetworkString) =>
  function* (outpoint: Outpoint): SagaGenerator {
    yield put(deleteUtxo(accountID, outpoint.txid, outpoint.vout, net));
  };

function* getAddressesFromAccount(
  account: Account,
  network: NetworkString
): SagaGenerator<AddressInterface[]> {
  const getAddresses = () =>
    account.getWatchIdentity(network).then((identity) => identity.getAddresses());
  return yield call(getAddresses);
}

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* utxosUpdater(
  accountID: AccountID,
  network: NetworkString
): SagaGenerator<void, IteratorYieldResult<UnblindedOutput>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID, network);
  const utxosMap = utxosTransactionsState?.utxosMap ?? {};
  const addresses = yield* getAddressesFromAccount(account, network);
  const skippedOutpoints: string[] = []; // for deleting
  const receivedUtxos: Record<string, Output> = {};
  const utxosGenerator = fetchAndUnblindUtxosGenerator(addresses, explorerURL, (utxo) => {
    const outpoint = toStringOutpoint(utxo);
    receivedUtxos[outpoint] = utxo;
    const skip = utxosMap[outpoint] !== undefined;
    if (skip) skippedOutpoints.push(toStringOutpoint(utxo));
    return skip;
  });
  yield* processAsyncGenerator<UnblindedOutput>(
    utxosGenerator,
    putAddUtxoAction(accountID, network)
  );

  const toDelete = Object.values(utxosMap).filter(
    (utxo) => !skippedOutpoints.includes(toStringOutpoint(utxo))
  );

  for (const utxo of toDelete) {
    yield* putDeleteUtxoAction(accountID, network)(utxo);
  }
  console.debug(`${new Date()} utxos received`, receivedUtxos);
}

const putAddTxAction = (accountID: AccountID, network: NetworkString, walletScripts: string[]) =>
  function* (tx: TxInterface) {
    yield put(
      addTx(accountID, toDisplayTransaction(tx, walletScripts, networks[network]), network)
    );
  };

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* txsUpdater(
  accountID: AccountID,
  network: NetworkString
): SagaGenerator<void, IteratorYieldResult<TxInterface>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID, network);
  const txsHistory = utxosTransactionsState?.transactions ?? {};
  const addresses = yield* getAddressesFromAccount(account, network);

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

function* updateTxsAndUtxos(
  accountID: AccountID,
  network: NetworkString
): Generator<AllEffect<any>, void, any> {
  yield all([txsUpdater(accountID, network), utxosUpdater(accountID, network)]);
}

function* requestAssetInfoFromEsplora(
  assetHash: string,
  network: NetworkString
): SagaGenerator<Asset> {
  const explorerForNetwork = yield* selectExplorerSaga();
  const getRequest = () =>
    axios.get(`${explorerForNetwork}/asset/${assetHash}`).then((r) => r.data);
  const result = yield call(getRequest);

  return {
    name: result?.name ?? 'Unknown',
    ticker: result?.ticker ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}

function* updaterWorker(
  chanToListen: Channel<UpdateTaskAction['payload']>
): SagaGenerator<void, UpdateTaskAction['payload']> {
  while (true) {
    const { accountID, network } = yield take(chanToListen);
    try {
      yield put(pushUpdaterLoader());
      yield* updateTxsAndUtxos(accountID, network);
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

function* assetsWorker(
  assetsChan: Channel<{ assetHash: string; network: NetworkString }>
): SagaGenerator<void, { assetHash: string; network: NetworkString }> {
  while (true) {
    const { assetHash, network } = yield take(assetsChan);
    if (yield* needUpdate(assetHash)) {
      try {
        const asset = yield* requestAssetInfoFromEsplora(assetHash, network);
        yield put(addAsset(assetHash, asset));
      } catch (e) {
        console.warn(`Error fetching asset ${assetHash}`, e);
      }
    }
  }
}

function updateUtxoAssets(assetsChan: Channel<{ assetHash: string; network: NetworkString }>) {
  return function* () {
    const utxos = yield* selectAllUnspentsSaga();
    const assets = new Set(utxos.map(getAsset));
    const network = yield* selectNetworkSaga();

    for (const assetHash of assets) {
      yield put(assetsChan, { assetHash, network });
    }
  };
}

export function* watchForAddUtxoAction(
  chan: Channel<{ assetHash: string; network: NetworkString }>
): SagaGenerator<void, AddUtxoAction> {
  while (true) {
    const action = yield take(ADD_UTXO);
    const asset = getAsset(action.payload.utxo);
    if (asset) {
      yield put(chan, { assetHash: asset, network: action.payload.network });
    }
  }
}

// starts a set of workers in order to handle asynchronously the UPDATE_TASK action
export function* watchUpdateTask(): SagaGenerator<void, UpdateTaskAction> {
  const MAX_UPDATER_WORKERS = 3;
  const accountToUpdateChan = yield* createChannel<UpdateTaskAction['payload']>();

  for (let i = 0; i < MAX_UPDATER_WORKERS; i++) {
    yield fork(updaterWorker, accountToUpdateChan);
  }

  // start the asset updater
  const assetsChan = yield* createChannel<{ assetHash: string; network: NetworkString }>();
  yield fork(assetsWorker, assetsChan);
  yield fork(watchForAddUtxoAction, assetsChan); // this will fee the assets chan

  // listen for UPDATE_TASK
  while (true) {
    const { payload } = yield take(UPDATE_TASK);
    yield fork(updateUtxoAssets(assetsChan));
    yield put(accountToUpdateChan, payload);
  }
}

// starts an update for all accounts after each AUTHENTICATION_SUCCESS action
// only updates the accounts for the current network
export function* updateAfterEachLoginAction(): SagaGenerator<void, void> {
  yield takeLatest(AUTHENTICATION_SUCCESS, function* () {
    // enable periodic updaters
    periodicUpdater();
    periodicTaxiUpdater();
    // update taxi assets, utxos and txs
    const accountsID = yield* selectAllAccountsIDsSaga();
    const network = yield* selectNetworkSaga();
    for (const ID of accountsID) {
      yield put(updateTaxiAssets());
      yield put(updateTaskAction(ID, network));
    }
  });
}
