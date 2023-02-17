import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import {
  sendFlowRepository,
  useSelectAllAssets,
  useSelectUtxos,
} from '../../../infrastructure/storage/common';
import { computeBalances } from '../../../domain/transaction';

const SendSelectAsset: React.FC = () => {
  const history = useHistory();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [utxos] = useSelectUtxos()();
  const balanceAssets = useSelectAllAssets();

  useEffect(() => {
    if (utxos) setBalances(computeBalances(utxos));
  }, [utxos]);

  const handleSend = async (assetHash: string) => {
    // cache the assehash selected and go to address amount form
    await sendFlowRepository.setSelectedAsset(assetHash);
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  return (
    <AssetListScreen
      title="Send Asset"
      onClick={handleSend}
      assets={balanceAssets}
      balances={balances}
      emptyText="You don't have any assets to send."
    />
  );
};

export default SendSelectAsset;
