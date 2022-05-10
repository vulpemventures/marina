import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE } from '../routes/constants';
import ButtonAsset from './button-asset';
import InputIcon from './input-icon';
import ShellPopUp from './shell-popup';
import { getAssetImage } from '../../application/utils/constants';
import { BalancesByAsset } from '../../application/redux/selectors/balance.selector';
import { Asset } from '../../domain/assets';
import ButtonList from './button-list';
import { sortAssets } from '../utils/sort';
import Modal from './modal';
import ModalBottomSheet from './modal-bottom-sheet';

export interface AssetListProps {
  assets: Array<Asset & { assetHash: string, canSubmarineSwap: boolean }>; // the assets to display
  onClick: (assetHash: string, isSubmarineSwap: boolean) => Promise<void>;
  balances?: BalancesByAsset;
  title: string;
}

const AssetListScreen: React.FC<AssetListProps> = ({ title, onClick, assets, balances }) => {
  const history = useHistory();

  // bottom sheet modal
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("");


  // sort assets
  const [sortedAssets, setSortedAssets] = useState(sortAssets(assets));

  useEffect(() => {
    setSortedAssets(sortAssets(assets));
    setSearchResults(sortedAssets);
  }, [assets]);

  // Filter assets
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(sortedAssets);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults(sortedAssets);
    }

    const results = sortedAssets.filter(
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

  const handleClick = async ({
    assetHash,
    canSubmarineSwap
  }: any) => {
    if (canSubmarineSwap) {
      setShowBottomSheet(true);
      setSelectedAsset(assetHash);
    } else {
      onClick(assetHash as string, false)
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
        <ButtonList title={title} emptyText="no assets to display...">
          {searchResults.map((asset, index) => (
            <ButtonAsset
              assetImgPath={getAssetImage(asset.assetHash)}
              assetHash={asset.assetHash}
              assetName={asset.name}
              assetTicker={asset.ticker}
              assetPrecision={asset.precision}
              canSubmarineSwap={asset.canSubmarineSwap}
              quantity={balances ? balances[asset.assetHash] : undefined}
              key={index}
              handleClick={handleClick}
            />
          ))}
        </ButtonList>
      </div>
      <ModalBottomSheet isOpen={showBottomSheet} onClose={() => setShowBottomSheet(false)}>
        <h1 className="text-lg">Select network</h1>
        <div className="flex justify-center">
          <div className="h-15 p-2" onClick={() => onClick(selectedAsset, false)}>
            <img
              className="w-10 h-10 mt-0.5 block mx-auto mb-2"
              src={'assets/images/liquid-network-logo.png'}
              alt="liquid network logo"
            />
            <p className='text-xs'>Liquid Network</p>
          </div>
          <div className="h-15 p-2" onClick={() => onClick(selectedAsset, true)}>
            <img
              className="w-10 h-10 mt-0.5 block mx-auto mb-2"
              src={'assets/images/zap.png'}
              alt="lightning network logo"
            />
            <p className='text-xs'>Lightning Network</p>
          </div>

        </div>
      </ModalBottomSheet>
    </ShellPopUp>
  );
};

export default AssetListScreen;
