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
