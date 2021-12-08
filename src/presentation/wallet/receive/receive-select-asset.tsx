import React from 'react';
import { useHistory } from 'react-router';
import { RECEIVE_ADDRESS_ROUTE } from '../../routes/constants';
import { Network } from '../../../domain/network';
import { Asset } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';

export interface ReceiveSelectAssetProps {
  network: Network;
  assets: Array<Asset & { assetHash: string }>;
}

const ReceiveSelectAssetView: React.FC<ReceiveSelectAssetProps> = ({ network, assets }) => {
  const history = useHistory();

  const handleSend = (asset: string) => {
    return Promise.resolve(history.push(`${RECEIVE_ADDRESS_ROUTE}/${asset}`));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleSend}
      network={network}
      assets={[UnknowAsset].concat(assets)}
    />
  );
};

const UnknowAsset: Asset & { assetHash: string } = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: 'new_asset',
};

export default ReceiveSelectAssetView;
