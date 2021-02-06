import { IWallet } from '../wallet/wallet';
import { IApp } from '../app/app';
import { IAppRepository } from '../app/i-app-repository';
import { IWalletRepository } from '../wallet/i-wallet-repository';
import { OnboardingState } from '../../application/store/reducers/onboarding-reducer';
import { AssetsByNetwork } from '../asset';
import { IAssetsRepository } from '../asset/i-assets-repository';

export interface IAppState {
  app: IApp;
  assets: AssetsByNetwork;
  onboarding: OnboardingState;
  wallets: IWallet[];
}

export interface IError {
  message?: string;
  stack?: string;
}

// State Management
export type Action<T = unknown> = [string, Record<string, T>?];

export type Dispatch<A> = (value: A) => void;

export type Repositories = {
  app: IAppRepository;
  assets: IAssetsRepository;
  wallet: IWalletRepository;
};

export interface Thunk<S, A> {
  (dispatch: Dispatch<A | Thunk<S, A>>, getState: () => S, repositories: Repositories): void;
}

export type DispatchOrThunk = Dispatch<Action> | Thunk<IAppState, Action>;
