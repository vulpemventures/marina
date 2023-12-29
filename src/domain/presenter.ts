import type { NetworkString, Asset, UnblindedOutput } from 'marina-provider';
import type { TxDetailsExtended } from './transaction';
import type { BlockHeader } from './chainsource';

export interface LoadingValue<T> {
  value: T;
  loading: boolean;
}

export interface PresentationCache {
  network: NetworkString;
  authenticated: LoadingValue<boolean>;
  balances: LoadingValue<Record<string, number>>;
  utxos: LoadingValue<UnblindedOutput[]>;
  assetsDetails: LoadingValue<Record<string, Asset>>;
  transactions: LoadingValue<TxDetailsExtended[]>;
  blockHeaders: LoadingValue<Record<number, BlockHeader>>;
  walletAssets: LoadingValue<Set<string>>;
}
// present computes the frontend data from repositories
// it emits PresentationCache to the frontend
export interface Presenter {
  present(onNewCache: (cache: PresentationCache) => void): Promise<void>; // returns a function to stop the presenter
  stop(): void;
}
