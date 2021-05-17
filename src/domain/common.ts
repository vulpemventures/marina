import { IWallet } from './wallet';
import { IApp } from './app';
import { OnboardingState } from '../application/redux/reducers/onboarding-reducer';
import { TransactionState } from '../application/redux/reducers/transaction-reducer';
import { AssetsByNetwork } from './assets';
import { TxsHistoryByNetwork } from './transaction';

export interface RootReducerState {
  app: IApp;
  assets: AssetsByNetwork;
  onboarding: OnboardingState;
  transaction: TransactionState;
  txsHistory: TxsHistoryByNetwork;
  wallets: IWallet[];
}

export interface IError {
  message: string;
  stack: string;
}

