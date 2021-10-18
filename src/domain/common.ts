import { ConnectData } from './connect';
import { IWallet } from './wallet';
import { IApp } from './app';
import { OnboardingState } from '../application/redux/reducers/onboarding-reducer';
import { TransactionState } from '../application/redux/reducers/transaction-reducer';
import { Action } from 'redux';
import { TaxiState } from '../application/redux/reducers/taxi-reducer';
import { IAssets } from './assets';

export interface RootReducerState {
  app: IApp;
  assets: IAssets;
  onboarding: OnboardingState;
  transaction: TransactionState;
  wallet: IWallet;
  connect: ConnectData;
  taxi: TaxiState;
}

export interface ActionWithPayload<T> extends Action<string> {
  payload: T;
}

export interface IError {
  message: string;
  stack: string;
}
