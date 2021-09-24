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

  const handleSend = async (assetHash: string) => {
    history.push(RECEIVE_ADDRESS_ROUTE);
  };

  return (
    <AssetListScreen title="Receive Asset" onClick={handleSend} network={network} assets={assets} />
  );
};

export default ReceiveSelectAssetView;
