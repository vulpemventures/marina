import { UtxoInterface, Outpoint, fetchAndUnblindUtxosGenerator, AddressInterface, TxInterface, address, networks, BlindingKeyGetter, fetchAndUnblindTxsGenerator } from "ldk";
import { put, call, fork, all, take, AllEffect } from "redux-saga/effects";
import { buffers, Channel, channel } from "@redux-saga/core";
import { Account, AccountID } from "../../../domain/account";
import { Network } from "../../../domain/network";
import { UtxosAndTxsHistory } from "../../../domain/transaction";
import { toDisplayTransaction, toStringOutpoint } from "../../utils";
import { addTx } from "../actions/transaction";
import { addUtxo, deleteUtxo } from "../actions/utxos";
import { getExplorerURLSelector } from "../selectors/app.selector";
import { selectUnspentsAndTransactions } from "../selectors/wallet.selector";
import { newSagaSelector, processAsyncGenerator, SagaGenerator, selectAccountSaga, selectNetworkSaga } from "./utils";
import { UPDATE_TASK } from "../actions/action-types";

const selectExplorerSaga = newSagaSelector(getExplorerURLSelector);

function selectUnspentsAndTransactionsSaga(accountID: AccountID): SagaGenerator<UtxosAndTxsHistory> {
  return newSagaSelector(selectUnspentsAndTransactions(accountID))();
}

const putAddUtxoAction = (accountID: AccountID) => function* (utxo: UtxoInterface): SagaGenerator {
  yield put(addUtxo(accountID, utxo));
}

const putDeleteUtxoAction = (accountID: AccountID) => function* (outpoint: Outpoint): SagaGenerator {
  yield put(deleteUtxo(accountID, outpoint.txid, outpoint.vout));
}

function* getAddressesFromAccount(account: Account): SagaGenerator<AddressInterface[]> {
  const getAddresses = () => account.getWatchIdentity().then(identity => identity.getAddresses());
  return yield call(getAddresses);
}

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* utxosUpdater(accountID: AccountID): SagaGenerator<void, IteratorYieldResult<UtxoInterface>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID);
  const utxosMap = utxosTransactionsState.utxosMap ?? {};
  const addresses = yield* getAddressesFromAccount(account)
  const skippedOutpoints: string[] = []; // for deleting
  const utxosGenerator = fetchAndUnblindUtxosGenerator(
    addresses,
    explorerURL,
    (utxo) => {
      const outpoint = toStringOutpoint(utxo)
      const skip = utxosMap[outpoint] !== undefined;
      if (skip) skippedOutpoints.push(toStringOutpoint(utxo));
      return skip;
    }
  )
  yield* processAsyncGenerator<UtxoInterface>(
    utxosGenerator,
    putAddUtxoAction(accountID),
  );

  const toDelete = Object.values(utxosMap)
    .filter(utxo => !skippedOutpoints.includes(toStringOutpoint(utxo)));
  
  for (const utxo of toDelete) {
    yield* putDeleteUtxoAction(accountID)(utxo);
  }
}

const putAddTxAction = (accountID: AccountID, network: Network, walletScripts: string[]) => function* (tx: TxInterface) {
  yield put(addTx(accountID, toDisplayTransaction(tx, walletScripts, networks[network]), network));
}

// UtxosUpdater lets to update the utxos state for a given AccountID
// it fetches and unblinds the unspents comming from the explorer
function* txsUpdater(accountID: AccountID): SagaGenerator<void, IteratorYieldResult<TxInterface>> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) return;
  const explorerURL = yield* selectExplorerSaga();
  const network = yield* selectNetworkSaga();
  const utxosTransactionsState = yield* selectUnspentsAndTransactionsSaga(accountID);
  const txsHistory = utxosTransactionsState.transactions[network] ?? {};
  const addresses = yield* getAddressesFromAccount(account)

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
    putAddTxAction(accountID, network, walletScripts),
  );
}

function* updateTxsAndUtxos(accountID: AccountID): Generator<AllEffect<any>, void, any> {
  yield all([
    txsUpdater(accountID),
    utxosUpdater(accountID) 
  ])
}

function* createChannel<T>(): SagaGenerator<Channel<T>> {
  return yield call(channel, buffers.sliding(10));
}

function* updaterWorker(channel: Channel<AccountID>): SagaGenerator<void, AccountID> {
  while (true) {
    const accountID = yield take(channel);
    yield* updateTxsAndUtxos(accountID);
  }
}

// starts a set of workers in order to handle asynchronously the UPDATE_TASK action
export function* watchUpdateTask(): SagaGenerator<void, { payload: AccountID }> {
  const MAX_WORKERS = 3;
  const chan = yield* createChannel<AccountID>();
 
  for (let i = 0; i < MAX_WORKERS; i++) {
    yield fork(updaterWorker, chan);
  }

  while (true) {
    const { payload } = yield take(UPDATE_TASK);
    yield put(chan, payload);
  }
}