import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE } from '../routes/constants';
import ButtonAsset from './button-asset';
import InputIcon from './input-icon';
import ShellPopUp from './shell-popup';
import ButtonList from './button-list';
import type { Asset, NetworkString } from 'marina-provider';
import ModalSelectNetwork from './modal-select-network';
import { networks } from 'liquidjs-lib';

export interface AssetListProps {
  assets: Array<Asset>; // the assets to display
  network: NetworkString;
  onClick: (assetHash: string, isSubmarineSwap: boolean) => Promise<void>;
  balances?: Record<string, number>;
  title: string;
  emptyText?: string;
}

const AssetListScreen: React.FC<AssetListProps> = ({
  title,
  onClick,
  assets,
  network,
  balances,
  emptyText,
}) => {
  const history = useHistory();

  // bottom sheet modal
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('');

  useEffect(() => {
    setSearchResults(assets);
  }, [assets]);

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(assets);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults(assets);
    }

    const results = assets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchTerm) || a.ticker.toLowerCase().includes(searchTerm)
    );

    setSearchResults(results);
    return () => {
      setSearchTerm('');
      setSearchResults(assets);
    };
  }, [searchTerm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase().replace('-', '');
    setSearchTerm(searchTerm);
  };

  const handleClick = async ({ assetHash }: any) => {
    if (assetHash === networks[network].assetHash || assetHash === 'new_asset') {
      setShowBottomSheet(true);
      setSelectedAsset(assetHash);
    } else {
      await onClick(assetHash as string, false);
    }
  };

  const handleBackBtn = () => {
    history.push(DEFAULT_ROUTE);
  };

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-wave-bottom-sm.png"
      className="h-popupContent bg-primary container mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Select asset"
    >
      <InputIcon
        className="my-4"
        imgIconPath="assets/images/search.svg"
        imgIconAlt="search"
        onChange={handleChange}
        type="search"
      />

      <div className="h-96 pb-1">
        <ButtonList title={title} emptyText={emptyText ?? 'no assets to display...'}>
          {searchResults.map((asset, index) => (
            <ButtonAsset
              asset={asset}
              quantity={balances ? balances[asset.assetHash] : undefined}
              key={index}
              handleClick={handleClick}
            />
          ))}
        </ButtonList>
      </div>
      <ModalSelectNetwork
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        onLightning={() => onClick(selectedAsset, true)}
        onLiquid={() => onClick(selectedAsset, false)}
      ></ModalSelectNetwork>
    </ShellPopUp>
  );
};

export default AssetListScreen;
