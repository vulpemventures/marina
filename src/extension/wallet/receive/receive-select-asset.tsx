import React from 'react';
import { useHistory } from 'react-router';
import { RECEIVE_ADDRESS_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import { Asset } from '../../../domain/asset';
import { useSelectAllAssets } from '../../../infrastructure/storage/common';

const ReceiveSelectAsset: React.FC = () => {
  const history = useHistory();
  const allAssets = useSelectAllAssets();

  const handleSend = (asset: string) => {
    return Promise.resolve(history.push(`${RECEIVE_ADDRESS_ROUTE}/${asset}`));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleSend}
      assets={[UnknowAsset].concat(allAssets)}
    />
  );
};

const UnknowAsset: Asset = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: 'new_asset',
};

export default ReceiveSelectAsset;
