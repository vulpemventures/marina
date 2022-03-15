import type { StrictEffect} from 'redux-saga/effects';
import { select, call } from 'redux-saga/effects';
import type { Account, AccountID} from '../../../domain/account';
import { MainAccountID } from '../../../domain/account';
import type { RootReducerState } from '../../../domain/common';
import {
  selectEsploraForNetwork,
  selectEsploraURL,
  selectNetwork,
} from '../selectors/app.selector';
import {
  selectAccount,
  selectAllAccountsIDs,
  selectUpdaterIsLoading,
  selectUtxos,
} from '../selectors/wallet.selector';
import { isBufferLike, reviver } from '../../utils/browser-storage-converters';
import type { NetworkString } from 'ldk';
import type { Channel} from 'redux-saga';
import { channel, buffers } from 'redux-saga';

export type SagaGenerator<ReturnType = void, YieldType = any> = Generator<
  StrictEffect,
  ReturnType,
  YieldType
>;

// customSagaParser is a recursive function that parses the result of a saga selector
// this is a trick due to the fact that the state requested by saga is parsed by JSON.parse
// which does not include our custom Buffer serialization format @see browser-storage-converters.ts file.
function customSagaParser(obj: any): any {
  if (typeof obj === 'object') {
    if (isBufferLike(obj)) {
      return reviver('', obj);
    }

    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        obj[key] = customSagaParser(obj[key]);
      }
    }
  }

  return obj;
}

// create a saga "selector" (a generator) from a redux selector function
export function newSagaSelector<R>(selectorFn: (state: RootReducerState) => R) {
  return function* (): SagaGenerator<R> {
    const result = yield select(selectorFn);
    return customSagaParser(result);
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

export function* createChannel<T>(): SagaGenerator<Channel<T>> {
  return yield call(channel, buffers.sliding(10));
}

export const selectNetworkSaga = newSagaSelector(selectNetwork);
export const selectAllAccountsIDsSaga = newSagaSelector(selectAllAccountsIDs);
export const selectExplorerSaga = newSagaSelector(selectEsploraURL);
export const selectUpdaterIsLoadingSaga = newSagaSelector(selectUpdaterIsLoading);
export const selectAllUnspentsSaga = newSagaSelector(selectUtxos(MainAccountID));

export function selectAccountSaga(accountID: AccountID): SagaGenerator<Account | undefined> {
  return newSagaSelector(selectAccount(accountID))();
}

export function selectExplorerSagaForNet(net: NetworkString): SagaGenerator<string> {
  return newSagaSelector(selectEsploraForNetwork(net))();
}
