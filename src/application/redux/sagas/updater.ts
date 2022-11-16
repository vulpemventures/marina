import {
  Outpoint,
  AddressInterface,
  TxInterface,
  UnblindedOutput,
  NetworkString,
  BlindingKeyGetterAsync,
  fetchTx,
  unblindTransaction,
  isUnblindedOutput,
} from 'ldk';
import {
  privateBlindKeyGetter,
  address,
  networks,
  getAsset,
} from 'ldk';
import type { Account, AccountID } from '../../../domain/account';
import { addTx } from '../actions/transaction';
import type { AddUtxoAction } from '../actions/utxos';
import { addUtxo, deleteUtxo } from '../actions/utxos';
import { SagaGenerator, selectExplorerURLsSaga, selectUtxosMapByScriptHashSaga } from './utils';
import {
  createChannel,
  newSagaSelector,
  selectAccountSaga,
  selectAllAccountsIDsSaga,
  selectAllUnspentsSaga,
  selectNetworkSaga,
} from './utils';
import { ADD_UTXO, AUTHENTICATION_SUCCESS, UPDATE_SCRIPT_TASK } from '../actions/action-types';
import type { Asset } from '../../../domain/assets';
import axios from 'axios';
import type { RootReducerState } from '../../../domain/common';
import { addAsset } from '../actions/asset';
import type { UpdateScriptTaskAction } from '../actions/task';
import type { Channel } from 'redux-saga';
import { put, take, fork, call, takeLatest } from 'redux-saga/effects';
import { toStringOutpoint } from '../../utils/utxos';
import { functionOR, toDisplayTransaction } from '../../utils/transaction';
import { defaultPrecision } from '../../utils/constants';
import { periodicTaxiUpdater } from '../../../background/alarms';
import UnblindError from 'ldk/dist/error/unblind-error';
import { TxDisplayInterface } from '../../../domain/transaction';

const putAddUtxoAction = (accountID: AccountID, net: NetworkString) =>
  function* (utxo: UnblindedOutput): SagaGenerator {
    yield put(addUtxo(accountID, utxo, net));
  };

const putAddTransactionAction = (accountID: AccountID, net: NetworkString) =>
  function* (tx: TxDisplayInterface): SagaGenerator {
    yield put(addTx(accountID, tx, net));
  };

const putDeleteUtxoAction = (accountID: AccountID, net: NetworkString) =>
  function* (outpoint: Outpoint): SagaGenerator {
    yield put(deleteUtxo(accountID, outpoint.txid, outpoint.vout, net));
  };

function* getPrivateBlindKeyGetter(
  network: NetworkString
): SagaGenerator<BlindingKeyGetterAsync> {
  const allAccountsIDs = yield* selectAllAccountsIDsSaga();
  const makeGetPrivateBlindKey = (account: Account) => async () => {
    const identity = await account.getWatchIdentity(network);
    return privateBlindKeyGetter(identity);
  };

  const accounts = [];
  for (const accountID of allAccountsIDs) {
    const account = yield* selectAccountSaga(accountID);
    if (!account) continue;
    accounts.push(account);
  }
  const getters: BlindingKeyGetterAsync[] = [];
  for (const account of accounts) {
    const privKeyGetter = yield call(makeGetPrivateBlindKey(account));
    getters.push(privKeyGetter);
  }
  return async (script: string) => {
    try {
      for (const getter of getters) {
        try {
          const key = await getter(script);
          return key;
        } catch (e) {
          continue
        }
      }
      throw new Error('No key able to unblind the script: ' + script);
    } catch (err) {
      console.error('getPrivateBlindKeyGetter', err);
      return undefined;
    }
  }
}

function* fetchTxSaga(txid: string, network: NetworkString): SagaGenerator<TxInterface> {
  const explorer = yield* selectExplorerURLsSaga(network)();
  const tx = yield call(fetchTx, txid, explorer.esploraURL);
  return tx;
}

function* unblindTx(tx: TxInterface, network: NetworkString): SagaGenerator<{
  unblindedTx: TxInterface;
  errors: UnblindError[];
}> {
  const blindKeyGetter = yield* getPrivateBlindKeyGetter(network);
  const wrappedUnblindTx = (tx: TxInterface, blindKeyGetter: BlindingKeyGetterAsync) => async () => {
    const res = await unblindTransaction(tx, blindKeyGetter);
    return res;
  }
  const unblindResult = yield call(wrappedUnblindTx(tx, blindKeyGetter));
  return unblindResult;
}

function* fetchAndUnblindTransaction(network: NetworkString, txid: string): SagaGenerator<TxInterface> {
  const tx = yield* fetchTxSaga(txid, network);
  const unblindResult = yield* unblindTx(tx, network);
  return unblindResult.unblindedTx;
}

function* getAddressesFromAccount(
  account: Account,
  network: NetworkString
): SagaGenerator<AddressInterface[]> {
  const getAddresses = () =>
    account.getWatchIdentity(network).then((identity) => identity.getAddresses());
  return yield call(getAddresses);
}

// returns all the scripts from accounts addresses
function* getAllWalletScripts(network: NetworkString) {
  const accounts = yield* selectAllAccountsIDsSaga();
  const scripts = [];
  for (const accountID of accounts) {
    const account = yield* selectAccountSaga(accountID);
    if (!account) continue;
    const addresses = yield* getAddressesFromAccount(account, network);
    scripts.push(
      ...addresses.map((a) => address.toOutputScript(a.confidentialAddress).toString('hex'))
    );
  }
  return scripts;
}

function* requestAssetInfoFromEsplora(
  assetHash: string,
  network: NetworkString
): SagaGenerator<Asset> {
  const explorerForNetwork = yield* selectExplorerURLsSaga(network)();
  const URL = explorerForNetwork.electrsURL;
  const getRequest = () =>
    axios.get(`${URL}/asset/${assetHash}`).then((r) => r.data);
  const result = yield call(getRequest);

  return {
    name: result?.name ?? 'Unknown',
    ticker: result?.ticker ?? assetHash.slice(0, 4).toUpperCase(),
    precision: result?.precision ?? defaultPrecision,
  };
}

function* updateScriptWorker(
  inChan: Channel<UpdateScriptTaskAction['payload']>
): SagaGenerator<void, UpdateScriptTaskAction['payload']> {
  while (true) {
    try {
      const { network, scripthash, unspentState } = yield take(inChan);
      const [currentUtxos, accountID] = yield* selectUtxosMapByScriptHashSaga(network, scripthash)();
      // check if we have new outpoints
      const newOutpoints = unspentState.filter(
        ({ tx_hash, tx_pos }) => currentUtxos[toStringOutpoint({ txid: tx_hash, vout: tx_pos })] === undefined
      );
      // check if we have to delete outpoints
      const toDelete = Object.values(currentUtxos).filter(
        (utxo) => !unspentState.find((u) => u.tx_hash === utxo.txid && u.tx_pos === utxo.vout)
      );

      // put DELETE_UTXO actions for each outpoint to delete
      for (const toDeleteUtxo of toDelete) {
        yield* putDeleteUtxoAction(accountID, network)(toDeleteUtxo);
      }

      // fetch and unblind new transactions and put ADD_TX actions and ADD_UTXO actions
      for (const newOutpoint of newOutpoints) {
        try {
          const unblindedTransaction = yield* fetchAndUnblindTransaction(network, newOutpoint.tx_hash);
          const walletScripts = yield* getAllWalletScripts(network);
          const formattedTransaction = toDisplayTransaction(unblindedTransaction, walletScripts, networks[network]);
          yield* putAddTransactionAction(accountID, network)(formattedTransaction);
          const utxo = unblindedTransaction.vout[newOutpoint.tx_pos];
          if (isUnblindedOutput(utxo)) {
            yield* putAddUtxoAction(accountID, network)(utxo);
          }
        } catch (err) {
          // just log and ignore the error (try to fetch and unblind the next outpoint)
          console.error(err);
          continue;
        }
      }
    } catch(err){ 
      console.error('updateScriptWorker error', err);
      continue
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

export function* watchForUpdateScriptTaskAction(
): SagaGenerator<void, UpdateScriptTaskAction> {
  const chan = yield* createChannel<UpdateScriptTaskAction['payload']>();

  // start the asset worker
  const assetsChan = yield* createChannel<{ assetHash: string; network: NetworkString }>();
  yield fork(assetsWorker, assetsChan);
  yield fork(watchForAddUtxoAction, assetsChan); // this will feed the assets chan when ADD_UTXO is dispatched

  const MAX_CONCURRENT_WORKERS = 1;
  for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
    yield fork(updateScriptWorker, chan);
  }

  while (true) {
    const action = yield take(UPDATE_SCRIPT_TASK);
    yield put(chan, action.payload);
  }
}

// starts an update for all accounts after each AUTHENTICATION_SUCCESS action
// only updates the accounts for the current network
export function* updateAfterEachLoginAction(): SagaGenerator<void, void> {
  yield takeLatest(AUTHENTICATION_SUCCESS, function* () {
    // enable periodic updaters
    periodicTaxiUpdater();
  });
}
