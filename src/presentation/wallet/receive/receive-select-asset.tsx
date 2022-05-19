import React from 'react';
import { useHistory } from 'react-router';
import type { Asset } from '../../../domain/assets';
import { RECEIVE_ADDRESS_ROUTE, LIGHTNING_ENTER_AMOUNT_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import type { NetworkString } from 'ldk';

export interface ReceiveSelectAssetProps {
  network: NetworkString;
  assets: Array<Asset & { assetHash: string; canSubmarineSwap: boolean }>;
}

const ReceiveSelectAssetView: React.FC<ReceiveSelectAssetProps> = ({ network, assets }) => {
  const history = useHistory();

  const handleReceive = async (asset: string, isSubmarineSwap: boolean) => {
    if (isSubmarineSwap) {
      return Promise.resolve(history.push(`${LIGHTNING_ENTER_AMOUNT_ROUTE}`));
    }
    return Promise.resolve(history.push(`${RECEIVE_ADDRESS_ROUTE}/${asset}`));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleReceive}
      assets={[UnknowAsset].concat(assets)}
    />
  );
};

const UnknowAsset: Asset & { assetHash: string; canSubmarineSwap: boolean } = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: 'new_asset',
  canSubmarineSwap: false,
};

export default ReceiveSelectAssetView;
