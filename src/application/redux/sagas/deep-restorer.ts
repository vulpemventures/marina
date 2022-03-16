import type {
  AddressInterface,
  EsploraRestorerOpts,
  IdentityInterface,
  NetworkString,
  Restorer,
  StateRestorerOpts,
} from 'ldk';
import { call, put, takeLeading } from 'redux-saga/effects';
import type { Account, AccountID } from '../../../domain/account';
import { extractErrorMessage } from '../../../presentation/utils/error';
import { getStateRestorerOptsFromAddresses } from '../../utils/restorer';
import { START_DEEP_RESTORATION } from '../actions/action-types';
import { updateTaskAction } from '../actions/updater';
import { setDeepRestorerError, setDeepRestorerIsLoading, setRestorerOpts } from '../actions/wallet';
import {
  selectDeepRestorerGapLimit,
  selectDeepRestorerIsLoading,
} from '../selectors/wallet.selector';
import type { SagaGenerator } from './utils';
import {
  newSagaSelector,
  selectAccountSaga,
  selectAllAccountsIDsSaga,
  selectExplorerSaga,
  selectNetworkSaga,
} from './utils';

function* getDeepRestorerSaga(
  account: Account,
  network: NetworkString
): SagaGenerator<Restorer<EsploraRestorerOpts, IdentityInterface>> {
  return yield call(() => account.getDeepRestorer(network));
}

function* restoreSaga(
  restorer: Restorer<EsploraRestorerOpts, IdentityInterface>,
  arg: EsploraRestorerOpts
): SagaGenerator<AddressInterface[]> {
  const restoreAddresses = () => restorer(arg).then((id) => id.getAddresses());
  return yield call(restoreAddresses);
}

// deep restore an account, i.e recompute addresses and try to see if they have received any transaction
// return the new StateRestorerOpts after this restoration
function* deepRestore(
  accountID: AccountID,
  gapLimit: number,
  esploraURL: string,
  net: NetworkString
): SagaGenerator<StateRestorerOpts> {
  const account = yield* selectAccountSaga(accountID);
  if (!account) throw new Error('Account not found');

  const restorer = yield* getDeepRestorerSaga(account, net);
  const restoredAddresses = yield* restoreSaga(restorer, { gapLimit, esploraURL });
  const stateRestorerOpts = getStateRestorerOptsFromAddresses(restoredAddresses);
  return stateRestorerOpts;
}

const selectDeepRestorerIsLoadingSaga = newSagaSelector(selectDeepRestorerIsLoading);
const selectDeepRestorerGapLimitSaga = newSagaSelector(selectDeepRestorerGapLimit);

// restoreAllAccounts will launch a deep restore for each account in the redux state
// it will restore the account for the current selected network (the one set in redux state)
// then it will update the restorerOpts in the state after restoration
function* restoreAllAccounts(): SagaGenerator {
  const isRunning = yield* selectDeepRestorerIsLoadingSaga();
  if (isRunning) return;

  yield put(setDeepRestorerIsLoading(true));

  try {
    const gapLimit = yield* selectDeepRestorerGapLimitSaga();
    const esploraURL = yield* selectExplorerSaga();
    const accountsIDs = yield* selectAllAccountsIDsSaga();
    for (const ID of accountsIDs) {
      const network = yield* selectNetworkSaga();
      const stateRestorerOpts = yield* deepRestore(ID, gapLimit, esploraURL, network);
      yield put(setRestorerOpts(ID, stateRestorerOpts, network)); // update state with new restorerOpts
      yield put(updateTaskAction(ID, network)); // update utxos and transactions according to the restored addresses (on network)
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
