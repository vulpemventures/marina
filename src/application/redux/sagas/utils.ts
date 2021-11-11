import { StrictEffect, select, call } from 'redux-saga/effects';
import { Account, AccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import { getExplorerURLSelector, selectNetwork } from '../selectors/app.selector';
import { selectAccount, selectAllAccountsIDs } from '../selectors/wallet.selector';

export type SagaGenerator<ReturnType = void, YieldType = any> = Generator<
  StrictEffect,
  ReturnType,
  YieldType
>;

// create a saga "selector" (a generator) from a redux selector function
export function newSagaSelector<R>(selectorFn: (state: RootReducerState) => R) {
  return function* (): SagaGenerator<R> {
    const result = yield select(selectorFn);
    return result;
  };
}

// redux-saga does not handle async generator
// this is useful to pass through this limitation
export function* processAsyncGenerator<NextType>(
  asyncGenerator: AsyncGenerator<NextType>,
  onNext: (n: NextType) => SagaGenerator,
  onDone?: () => SagaGenerator
): SagaGenerator<void, IteratorYieldResult<NextType>> {
  const next = () => asyncGenerator.next();
  let n = yield call(next);
  while (!n.done) {
    yield* onNext(n.value);
    n = yield call(next);
  }

  if (onDone && n.done) {
    yield* onDone();
  }
}

export const selectNetworkSaga = newSagaSelector(selectNetwork);
export const selectAllAccountsIDsSaga = newSagaSelector(selectAllAccountsIDs);
export const selectExplorerSaga = newSagaSelector(getExplorerURLSelector);

export function selectAccountSaga(accountID: AccountID): SagaGenerator<Account | undefined> {
  return newSagaSelector(selectAccount(accountID))();
}
