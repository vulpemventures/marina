import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE } from '../routes/constants';
import ButtonAsset from './button-asset';
import InputIcon from './input-icon';
import ShellPopUp from './shell-popup';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../application/utils';
import { BalancesByAsset } from '../../application/redux/selectors/balance.selector';
import { Network } from '../../domain/network';
import { Asset } from '../../domain/assets';
import ButtonList from './button-list';

export interface AssetListProps {
  network: Network;
  assets: Array<Asset & { assetHash: string }>; // the assets to display
  onClick: (assetHash: string) => Promise<void>;
  balances?: BalancesByAsset;
}

const AssetListScreen: React.FC<AssetListProps> = ({ onClick, network, assets, balances }) => {
  const history = useHistory();

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
    >
      <InputIcon
        className="my-4"
        imgIconPath="assets/images/search.svg"
        imgIconAlt="search"
        onChange={handleChange}
        type="search"
      />

      <div className="h-96 pb-1">
        <ButtonList title="Assets" emptyText="no assets to display...">
          {searchResults.map((asset, index) => (
            <ButtonAsset
              assetImgPath={
                network === 'regtest'
                  ? imgPathMapRegtest[asset.ticker] ?? imgPathMapRegtest['']
                  : imgPathMapMainnet[asset.assetHash] ?? imgPathMapMainnet['']
              }
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
