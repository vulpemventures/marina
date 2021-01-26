import { Dispatch, Reducer } from 'react';
import { Thunk } from '../../../domain/common';
import { IAppRepository } from '../../../domain/app/i-app-repository';
import { IWalletRepository } from '../../../domain/wallet/i-wallet-repository';

export function mockThunkReducer<S, A>(
  reducer: Reducer<S, A>,
  initialState: S,
  repositories: {
    app: IAppRepository;
    wallet: IWalletRepository;
  }
) {
  const mockStore = () => {
    let actions: A[] = [];
    let state = { ...initialState };

    const self = {
      getState(): S {
        return state;
      },
      setState(newState: S): void {
        state = { ...newState };
      },
      reduce(action: A): S {
        return reducer(this.getState(), action);
      },
      dispatch(action: A): Dispatch<A | Thunk<S, A>> {
        actions.push(action);
        return typeof action == 'function'
          ? action(this.dispatch.bind(this), this.getState.bind(this), repositories)
          : this.setState(this.reduce(action));
      },
      clearActions(): void {
        actions = [];
      },
    };

    return self;
  };

  return mockStore();
}
