import React from 'react';
import { useHistory } from 'react-router';
import { LIGHTNING_ENTER_AMOUNT_ROUTE, RECEIVE_ADDRESS_ROUTE } from '../../routes/constants';
import AssetListScreen from '../../components/asset-list-screen';
import type { Asset } from 'marina-provider';
import { useStorageContext } from '../../context/storage-context';
import { UNKNOWN_ASSET_HASH } from '../../../domain/constants';

const ReceiveSelectAsset: React.FC = () => {
  const { cache, receiveFlowRepository } = useStorageContext();
  const history = useHistory();

  const handleReceive = async (asset: string, isSubmarineSwap: boolean) => {
    const route = isSubmarineSwap
      ? LIGHTNING_ENTER_AMOUNT_ROUTE
      : `${RECEIVE_ADDRESS_ROUTE}/${asset}`;
    return Promise.resolve(history.push(route));
  };

  return (
    <AssetListScreen
      title="Receive Asset"
      onClick={handleReceive}
      assets={[UnknowAsset].concat(
        Array.from(cache?.walletAssets.value || []).map(
          (assetHash) =>
            cache?.assetsDetails.value[assetHash] || {
              name: 'Unknown',
              ticker: assetHash.substring(0, 4),
              precision: 8,
              assetHash,
            }
        )
      )}
      network={cache?.network || 'liquid'}
    />
  );
};

const UnknowAsset: Asset = {
  ticker: 'Any',
  name: 'New asset',
  precision: 8,
  assetHash: UNKNOWN_ASSET_HASH,
};

export default ReceiveSelectAsset;
