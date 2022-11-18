import type { AddressInterface, TxInterface, NetworkString, BlindingKeyGetterAsync } from 'ldk';
import { fetchTx, unblindTransaction, privateBlindKeyGetter, address, getAsset } from 'ldk';
import type { Account, AccountID } from '../../../domain/account';
import { addTx } from '../actions/transaction';
import type { AddUtxoAction } from '../actions/utxos';
import { unlockUtxos } from '../actions/utxos';
import { SagaGenerator } from './utils';
import {
  selectExplorerURLsSaga,
  newSagaSelector,
  selectAccountSaga,
  selectAllAccountsIDsSaga,
} from './utils';
import { ADD_UTXO, AUTHENTICATION_SUCCESS } from '../actions/action-types';
import type { Asset } from '../../../domain/assets';
import axios from 'axios';
import type { RootReducerState } from '../../../domain/common';
import { addAsset } from '../actions/asset';
import { put, take, call, takeLatest } from 'redux-saga/effects';
import { defaultPrecision } from '../../utils/constants';
import { periodicTaxiUpdater } from '../../../background/alarms';
import type UnblindError from 'ldk/dist/error/unblind-error';
import type { TxDisplayInterface } from '../../../domain/transaction';

const putAddTransactionAction = (accountID: AccountID, net: NetworkString) =>
  function* (tx: TxDisplayInterface): SagaGenerator {
    yield put(addTx(accountID, tx, net));
  };

function* getPrivateBlindKeyGetter(network: NetworkString): SagaGenerator<BlindingKeyGetterAsync> {
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
          continue;
        }
      }
      throw new Error('No key able to unblind the script: ' + script);
    } catch (err) {
      console.error('getPrivateBlindKeyGetter', err);
      return undefined;
    }
  };
}

function* fetchTxSaga(txid: string, network: NetworkString): SagaGenerator<TxInterface> {
  const explorer = yield* selectExplorerURLsSaga(network)();
  const tx = yield call(fetchTx, txid, explorer.esploraURL);
  return tx;
}

function* unblindTx(
  tx: TxInterface,
  network: NetworkString
): SagaGenerator<{
  unblindedTx: TxInterface;
  errors: UnblindError[];
}> {
  const blindKeyGetter = yield* getPrivateBlindKeyGetter(network);
  const wrappedUnblindTx =
    (tx: TxInterface, blindKeyGetter: BlindingKeyGetterAsync) => async () => {
      const res = await unblindTransaction(tx, blindKeyGetter);
      return res;
    };
  const unblindResult = yield call(wrappedUnblindTx(tx, blindKeyGetter));
  return unblindResult;
}

function* fetchAndUnblindTransaction(
  network: NetworkString,
  txid: string
): SagaGenerator<TxInterface> {
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
