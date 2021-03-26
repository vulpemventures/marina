import { Network } from '../app/value-objects';
import { ConnectData, ConnectDataByNetwork } from './index';

export interface IConnectRepository {
  addConnectData(data: ConnectData, network: Network['value']): Promise<void>;
  getConnectData(): Promise<ConnectDataByNetwork>;
  init(data: ConnectDataByNetwork): Promise<void>;
  updateConnectData(cb: (data: ConnectDataByNetwork) => ConnectDataByNetwork): Promise<void>;
}
