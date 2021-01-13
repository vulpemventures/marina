// Credits: https://github.com/nathanbuchar/react-hook-thunk-reducer
import { Dispatch, Reducer, useCallback, useRef, useState } from 'react';
import { IApp } from '../../../domain/app/app';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { Thunk } from '../../../domain/common';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';

/**
 * Augments React's useReducer() hook so that the action
 * dispatcher supports thunks.
 *
 * @param {Function} reducer
 * @param {*} initialArg
 * @param {Function} [init]
 * @returns {[*, Dispatch]}
 */
function useThunkReducer<S, A>(
  reducer: Reducer<S, A>,
  initialArg: S,
  init: (s: S) => S = (a) => a,
  repositories: {
    app: IAppRepository,
    wallet: IWalletRepository,
  }
): [S, Dispatch<A | Thunk<S, A>>] {
  const [hookState, setHookState] = useState(init(initialArg));

  // State management.
  const state = useRef(hookState);
  const getState = useCallback(() => state.current, [state]);
  const setState = useCallback(
    (newState) => {
      state.current = newState;
      setHookState(newState);
    },
    [state, setHookState]
  );

  // Reducer.
  const reduce = useCallback(
    (action) => {
      return reducer(getState(), action);
    },
    [reducer, getState]
  );

  // Augmented dispatcher.
  // @ts-ignore: dispatch type is defined on return
  const dispatch = useCallback(
    (action) => {
      return typeof action === 'function' ? action(dispatch, getState, repositories) : setState(reduce(action));
    },
    [getState, setState, reduce]
  );

  return [hookState, dispatch];
}

export default useThunkReducer;
