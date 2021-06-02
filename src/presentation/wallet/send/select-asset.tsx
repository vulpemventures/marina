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

export interface SelectAssetProps {
  network: Network;
  balances: BalancesByAsset;
  balanceAssets: Array<Asset & { assetHash: string }>;
}

const SelectAssetView: React.FC<SelectAssetProps> = ({ network, balanceAssets, balances }) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(balanceAssets);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults(balanceAssets);
    }

    const results = balanceAssets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchTerm) || a.ticker.toLowerCase().includes(searchTerm)
    );

    setSearchResults(results);
  }, [searchTerm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase().replace('-', '');
    setSearchTerm(searchTerm);
  };

  const handleSend = async (assetHash: string) => {
    await dispatch(setAsset(assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
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
        className="my-8"
        imgIconPath="assets/images/search.svg"
        imgIconAlt="search"
        onChange={handleChange}
        type="search"
      />

      <div className="h-25.75 overflow-y-scroll">
        <div className="pb-4 space-y-4">
          {searchResults.map((asset) => (
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
              quantity={balances[asset.assetHash]}
              key={asset.assetHash}
              handleClick={({ assetHash }) => handleSend(assetHash as string)}
            />
          ))}
        </div>
      </div>
    </ShellPopUp>
  );
};

export default SelectAssetView;
