import { IWallet } from '../wallet/wallet';
import { IApp } from '../app/app';
import { IAppRepository } from '../app/i-app-repository';
import { IWalletRepository } from '../wallet/i-wallet-repository';
import { OnboardingState } from '../../application/store/reducers/onboarding-reducer';
import { TransactionState } from '../../application/store/reducers/transaction-reducer';
import { AssetsByNetwork } from '../asset';
import { IAssetsRepository } from '../asset/i-assets-repository';
import { TxsHistoryByNetwork } from '../transaction';
import { ITxsHistoryRepository } from '../transaction/i-txs-history-repository';
import { IConnectRepository } from '../connect/i-connect-repository';

export interface IAppState {
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

export type Repositories = {
  app: IAppRepository;
  assets: IAssetsRepository;
  connect: IConnectRepository;
  txsHistory: ITxsHistoryRepository;
  wallet: IWalletRepository;
};
