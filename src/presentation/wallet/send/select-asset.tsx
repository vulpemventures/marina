import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import ButtonAsset from '../../components/button-asset';
import InputIcon from '../../components/input-icon';
import ShellPopUp from '../../components/shell-popup';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { useDispatch } from 'react-redux';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { setAsset } from '../../../application/redux/actions/transaction';
import { Network } from '../../../domain/network';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { Asset } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';

export interface SelectAssetProps {
  network: Network;
  balances: BalancesByAsset;
  balanceAssets: Array<Asset & { assetHash: string }>;
}

const SelectAssetView: React.FC<SelectAssetProps> = ({ network, balanceAssets, balances }) => {
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
      network={network}
      assets={balanceAssets}
      balances={balances}
    />
  );
};

export default SelectAssetView;
