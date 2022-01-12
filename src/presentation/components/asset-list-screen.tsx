import React, { useEffect } from 'react';
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

export interface AssetListProps {
  assets: Array<Asset & { assetHash: string }>; // the assets to display
  onClick: (assetHash: string) => Promise<void>;
  balances?: BalancesByAsset;
  title: string;
}

const AssetListScreen: React.FC<AssetListProps> = ({ title, onClick, assets, balances }) => {
  const history = useHistory();

  // sort assets
  const [sortedAssets, setSortedAssets] = React.useState(sortAssets(assets));

  useEffect(() => {
    setSortedAssets(sortAssets(assets));
    setSearchResults(sortedAssets);
  }, [assets]);

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(sortedAssets);

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
              quantity={balances ? balances[asset.assetHash] : undefined}
              key={index}
              handleClick={({ assetHash }) => onClick(assetHash as string)}
            />
          ))}
        </ButtonList>
      </div>
    </ShellPopUp>
  );
};

export default AssetListScreen;
