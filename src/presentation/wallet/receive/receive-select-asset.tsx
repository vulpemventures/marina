import React from 'react';
import { useHistory } from 'react-router';
import { RECEIVE_ADDRESS_ROUTE } from '../../routes/constants';
import { NetworkType } from '../../../domain/network';
import { Asset } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';

export interface ReceiveSelectAssetProps {
  network: NetworkType;
  assets: Array<Asset & { assetHash: string }>;
}

const ReceiveSelectAssetView: React.FC<ReceiveSelectAssetProps> = ({ network, assets }) => {
  const history = useHistory();

  const handleSend = (_: string) => {
    return Promise.resolve(history.push(RECEIVE_ADDRESS_ROUTE));
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
