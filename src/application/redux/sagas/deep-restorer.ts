import { AddressInterface, EsploraRestorerOpts, IdentityInterface, Restorer, StateRestorerOpts } from "ldk";
import { call, put, takeLeading } from "redux-saga/effects";
import { Account, AccountID } from "../../../domain/account";
import { extractErrorMessage } from "../../../presentation/utils/error";
import { getStateRestorerOptsFromAddresses } from "../../utils";
import { START_DEEP_RESTORATION } from "../actions/action-types";
import { updateTaskAction } from "../actions/updater";
import { setDeepRestorerError, setDeepRestorerIsLoading, setRestorerOpts } from "../actions/wallet";
import { selectDeepRestorerGapLimit, selectDeepRestorerIsLoading } from "../selectors/wallet.selector";
import { newSagaSelector, SagaGenerator, selectAccountSaga, selectAllAccountsIDsSaga, selectExplorerSaga } from "./utils";

function* getDeepRestorerSaga(account: Account): SagaGenerator<Restorer<EsploraRestorerOpts, IdentityInterface>> {
  return yield call(account.getDeepRestorer);
}

function* restoreSaga(restorer: Restorer<EsploraRestorerOpts, IdentityInterface>, arg: EsploraRestorerOpts): SagaGenerator<AddressInterface[]> {
  const restoreAddresses = () => restorer(arg).then(id => id.getAddresses());
  return yield call(restoreAddresses);
}

function* deepRestore(accountID: AccountID, gapLimit: number, esploraURL: string): SagaGenerator<StateRestorerOpts> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) throw new Error("Account not found");

  const restorer = yield* getDeepRestorerSaga(account);
  const restoredAddresses = yield* restoreSaga(restorer, { gapLimit, esploraURL });
  const stateRestorerOpts = getStateRestorerOptsFromAddresses(restoredAddresses);
  return stateRestorerOpts;
}

const selectDeepRestorerIsLoadingSaga = newSagaSelector(selectDeepRestorerIsLoading);
const selectDeepRestorerGapLimitSaga = newSagaSelector(selectDeepRestorerGapLimit);

function* restoreAllAccounts(): SagaGenerator {
  const isRunning = yield* selectDeepRestorerIsLoadingSaga();
  if (isRunning) return;

  yield put(setDeepRestorerIsLoading(true));

  try {
    const gapLimit = yield* selectDeepRestorerGapLimitSaga();
    const esploraURL = yield* selectExplorerSaga();
    const accountsIDs = yield* selectAllAccountsIDsSaga();
    for (const ID of accountsIDs) {
      const stateRestorerOpts = yield* deepRestore(ID, gapLimit, esploraURL);
      yield put(setRestorerOpts(ID, stateRestorerOpts));
      yield put(updateTaskAction(ID)); // update utxos and transactions according to the restored addresses
    }
    yield put(setDeepRestorerError(undefined));
  } catch (e) {
    yield put(setDeepRestorerError(new Error(extractErrorMessage(e))));
  } finally {
    yield put(setDeepRestorerIsLoading(false));
  }
}

// watch for each START_DEEP_RESTORATION action
// if a restoration is not running: start restore all accounts
export function* watchStartDeepRestorer(): SagaGenerator {
  yield takeLeading(START_DEEP_RESTORATION, restoreAllAccounts);
}