import React from 'react';
import { useHistory } from 'react-router';
import { SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import { useDispatch } from 'react-redux';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { setAsset } from '../../../application/redux/actions/transaction';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { Asset } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';

export interface SendSelectAssetProps {
  balances: BalancesByAsset;
  balanceAssets: Array<Asset & { assetHash: string }>;
}

const SendSelectAssetView: React.FC<SendSelectAssetProps> = ({ balanceAssets, balances }) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleSend = async (assetHash: string) => {
    await dispatch(setAsset(assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };

  return (
    <AssetListScreen
      title="Send Asset"
      onClick={handleSend}
      assets={balanceAssets}
      balances={balances}
    />
  );
};

export default SendSelectAssetView;
