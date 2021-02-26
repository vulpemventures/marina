import { TxsHistoryByNetwork, TxsHistory } from './index';
import { Network } from '../app/value-objects';

export interface ITxsHistoryRepository {
  addTxsHistory(txsHistory: TxsHistory, network: Network['value']): Promise<void>;
  getTxsHistoryByNetwork(): Promise<TxsHistoryByNetwork>;
  init(txsHistoryByNetwork: TxsHistoryByNetwork): Promise<void>;
  updateTxsHistoryByNetwork(
    cb: (txsHistoryByNetwork: TxsHistoryByNetwork) => TxsHistoryByNetwork
  ): Promise<void>;
}
