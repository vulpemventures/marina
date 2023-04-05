import React from 'react';
import { useHistory } from 'react-router';
import { SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import { useStorageContext } from '../../context/storage-context';
import { Spinner } from '../../components/spinner';

const SendSelectAsset: React.FC = () => {
  const history = useHistory();
  const { sendFlowRepository, cache } = useStorageContext();

  const handleSend = async (assetHash: string) => {
    // cache the assehash selected and go to address amount form
    await sendFlowRepository.setSelectedAsset(assetHash);
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  if (cache?.assets.loading || cache?.balances.loading) return <Spinner />;

  return (
    <AssetListScreen
      title="Send Asset"
      onClick={handleSend}
      assets={cache?.assets.value || []}
      balances={cache?.balances.value || {}}
      emptyText="You don't have any assets to send."
    />
  );
};

export default SendSelectAsset;
