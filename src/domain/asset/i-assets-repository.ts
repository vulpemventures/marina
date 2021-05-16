import { Assets, AssetsByNetwork } from './index';
import { Network } from '../app/value-objects';

export interface IAssetsRepository {
  addAssets(assets: Assets, network: NetworkValue): Promise<void>;
  getAssets(): Promise<AssetsByNetwork>;
  init(assets: AssetsByNetwork): Promise<void>;
  updateAssets(cb: (assets: AssetsByNetwork) => AssetsByNetwork): Promise<void>;
}
