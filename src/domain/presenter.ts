import { NetworkString, Asset } from 'marina-provider';
import { TxDetailsExtended, UnblindedOutput } from './transaction';

export interface LoadingValue<T> {
  value: T;
  loading: boolean;
}

export interface PresentationCache {
  network: NetworkString;
  authenticated: LoadingValue<boolean>;
  balances: LoadingValue<Record<string, number>>;
  utxos: LoadingValue<UnblindedOutput[]>;
  assets: LoadingValue<Asset[]>;
  transactions: LoadingValue<TxDetailsExtended[]>;
}
// present computes the frontend data from repositories
// it emits PresentationCache to the frontend
export interface Presenter {
  present(onNewCache: (cache: PresentationCache) => void): Promise<() => void>; // returns a function to stop the presenter
}
