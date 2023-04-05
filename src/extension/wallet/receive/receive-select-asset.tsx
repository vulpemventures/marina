import React from 'react';
import { useHistory } from 'react-router';
import { RECEIVE_ADDRESS_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import type { Asset } from 'marina-provider';
import { useStorageContext } from '../../context/storage-context';

const ReceiveSelectAsset: React.FC = () => {
  const { cache } = useStorageContext();
  const history = useHistory();

  const handleSend = (asset: string) => {
    return Promise.resolve(history.push(`${RECEIVE_ADDRESS_ROUTE}/${asset}`));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleSend}
      assets={[UnknowAsset].concat(cache?.assets.value || [])}
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
