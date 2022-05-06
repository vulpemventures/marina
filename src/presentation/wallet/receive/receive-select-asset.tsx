import React from 'react';
import { useHistory } from 'react-router';
import type { Asset } from '../../../domain/assets';
import AssetListScreen from '../../components/asset-list-screen';
import type { NetworkString } from 'ldk';
import { RECEIVE_ADDRESS_ROUTE, LIGHTNING_ENTER_AMOUNT_INVOICE_ROUTE } from '../../routes/constants';
import { LN_SWAP_BOLTZ } from '../../../application/utils/constants';

export interface ReceiveSelectAssetProps {
  network: NetworkString;
  assets: Array<Asset & { assetHash: string }>;
}

const ReceiveSelectAssetView: React.FC<ReceiveSelectAssetProps> = ({ network, assets }) => {
  const history = useHistory();

  const handleSend = (asset: string) => {
    if (asset === LN_SWAP_BOLTZ) {
      return Promise.resolve(history.push(`${LIGHTNING_ENTER_AMOUNT_INVOICE_ROUTE}`));
    }
    return Promise.resolve(history.push(`${RECEIVE_ADDRESS_ROUTE}/${asset}`));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleSend}
      assets={[UnknowAsset, LightingSwap].concat(assets)}
    />
  );
};

const UnknowAsset: Asset & { assetHash: string } = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: 'new_asset',
};

const LightingSwap: Asset & { assetHash: string } = {
  ticker: 'LN-BTC',
  name: 'Lightning Network',
  precision: 8,
  assetHash: LN_SWAP_BOLTZ,
};

export default ReceiveSelectAssetView;
