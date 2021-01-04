import { IWallet } from '../wallet/wallet';
import { IPreferences } from '../preferences/preferences';

export interface IAppState {
  wallets: IWallet[];
  prefs: IPreferences;
}

export interface IError {
  message?: string;
  stack?: string;
}

// State Management
export type Dispatch<A> = (value: A) => void;

export interface Thunk<S, A> {
  (dispatch: Dispatch<A | Thunk<S, A>>, getState: () => S): void;
}

export type DispatchOrThunk =
  | React.Dispatch<[string, Record<string, unknown>?]>
  | Thunk<never, [string, Record<string, unknown>?]>;
