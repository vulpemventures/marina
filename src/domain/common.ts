import { ConnectData } from './connect';
import { WalletState } from './wallet';
import { IApp } from './app';
import { OnboardingState } from '../application/redux/reducers/onboarding-reducer';
import { TransactionState } from '../application/redux/reducers/transaction-reducer';
import { TaxiState } from '../application/redux/reducers/taxi-reducer';
import { IAssets } from './assets';
import { Action } from 'redux';

export interface RootReducerState {
  app: IApp;
  assets: IAssets;
  onboarding: OnboardingState;
  transaction: TransactionState;
  wallet: WalletState;
  connect: ConnectData;
  taxi: TaxiState;
}

export interface IError {
  message: string;
  stack: string;
}

export type ActionWithPayload<T> = Action<string> & { payload: T };