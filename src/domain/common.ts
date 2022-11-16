import type { ConnectData } from './connect';
import type { UtxosTransactionsState, WalletState } from './wallet';
import type { IApp } from './app';
import type { OnboardingState } from '../application/redux/reducers/onboarding-reducer';
import type { TransactionState } from '../application/redux/reducers/transaction-reducer';
import type { TaxiState } from '../application/redux/reducers/taxi-reducer';
import type { IAssets } from './assets';
import type { Action } from 'redux';

export interface RootReducerState {
  app: IApp;
  assets: IAssets;
  onboarding: OnboardingState;
  transaction: TransactionState;
  wallet: WalletState;
  connect: ConnectData;
  taxi: TaxiState;
  utxosTransactions: UtxosTransactionsState;
}

export interface IError {
  message: string;
  stack: string;
}

export type ActionWithPayload<T> = Action<string> & { payload: T };
