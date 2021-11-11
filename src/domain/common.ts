import { ConnectData } from './connect';
import { WalletState } from './wallet';
import { IApp } from './app';
import { OnboardingState } from '../application/redux/reducers/onboarding-reducer';
import { TransactionState } from '../application/redux/reducers/transaction-reducer';
import { Action } from 'redux';
import { TaxiState } from '../application/redux/reducers/taxi-reducer';
import { IAssets } from './assets';
import { AllowanceState } from '../application/redux/reducers/allowance-reducer';

export interface RootReducerState {
  app: IApp;
  assets: IAssets;
  onboarding: OnboardingState;
  transaction: TransactionState;
  wallet: WalletState;
  connect: ConnectData;
  taxi: TaxiState;
  allowance: AllowanceState;
}

export interface ActionWithPayload<T> extends Action<string> {
  payload: T;
}

export interface IError {
  message: string;
  stack: string;
}
