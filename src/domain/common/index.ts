import { IWallet } from '../wallet/wallet';
import { IApp } from '../app/app';
import { IAppRepository } from '../app/i-app-repository';
import { IWalletRepository } from '../wallet/i-wallet-repository';
import { OnboardingState } from '../../application/store/reducers/onboarding-reducer';

export interface IAppState {
  wallets: IWallet[];
  app: IApp;
  onboarding: OnboardingState;
}

export interface IError {
  message?: string;
  stack?: string;
}

// State Management
export type Action = [string, Record<string, unknown>?];

export type Dispatch<A> = (value: A) => void;

export interface Thunk<S, A> {
  (
    dispatch: Dispatch<A | Thunk<S, A>>,
    getState: () => S,
    repositories: {
      app: IAppRepository;
      wallet: IWalletRepository;
    }
  ): void;
}

export type DispatchOrThunk = Dispatch<Action> | Thunk<IAppState, Action>;
