import React from 'react';
import { useHistory } from 'react-router';
import type { Asset } from '../../../domain/assets';
import { RECEIVE_ADDRESS_ROUTE, LIGHTNING_ENTER_AMOUNT_ROUTE } from '../../routes/constants';
import { AssetSwap } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';
import type { NetworkString } from 'ldk';

export interface ReceiveSelectAssetProps {
  network: NetworkString;
  assets: AssetSwap[];
}

const ReceiveSelectAssetView: React.FC<ReceiveSelectAssetProps> = ({ network, assets }) => {
  const history = useHistory();

  const handleReceive = async (asset: string, isSubmarineSwap: boolean) => {
    const route = isSubmarineSwap
      ? LIGHTNING_ENTER_AMOUNT_ROUTE
      : `${RECEIVE_ADDRESS_ROUTE}/${asset}`;
    return Promise.resolve(history.push(route));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleReceive}
      assets={[UnknowAsset].concat(assets)}
    />
  );
};

const UnknowAsset: AssetSwap = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: '',
  canSubmarineSwap: false,
};

export default ReceiveSelectAssetView;
