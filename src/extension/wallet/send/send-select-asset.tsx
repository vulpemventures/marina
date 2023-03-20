import React from 'react';
import { useHistory } from 'react-router';
import { SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import { useStorageContext } from '../../context/storage-context';

const SendSelectAsset: React.FC = () => {
  const history = useHistory();
  const { sendFlowRepository, cache } = useStorageContext();

  const handleSend = async (assetHash: string) => {
    // cache the assehash selected and go to address amount form
    await sendFlowRepository.setSelectedAsset(assetHash);
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  return (
    <AssetListScreen
      title="Send Asset"
      onClick={handleSend}
      assets={cache?.assets || []}
      balances={cache?.balances || {}}
      emptyText="You don't have any assets to send."
    />
  );
};

export default SendSelectAsset;
