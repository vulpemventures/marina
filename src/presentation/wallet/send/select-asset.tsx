import React, { useEffect } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import ButtonAsset from '../../components/button-asset';
import InputIcon from '../../components/input-icon';
import ShellPopUp from '../../components/shell-popup';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { Network } from '../../../domain/app/value-objects';
import { IWallet } from '../../../domain/wallet/wallet';
import { AssetsByNetwork } from '../../../domain/asset';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../..';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { setAsset } from '../../../application/redux/actions/transaction';
import { unsetPendingTx } from '../../../application/redux/actions/wallet';

export interface SelectAssetProps {
  network: Network['value'];
  wallet: IWallet;
  assets: AssetsByNetwork;
  balances: BalancesByAsset;
}

const SelectAsset: React.FC<SelectAssetProps> = ({ network, wallet, assets, balances }) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    [assetName: string, assetTicker: string, precision: number, index: number][]
  >([]);

  useEffect(() => {
    const terms: [
      name: string,
      ticker: string,
      precision: number,
      index: number
    ][] = Object.entries(assets[network]).map(([_, { name, ticker, precision }], index) => [
      name,
      ticker,
      precision,
      index,
    ]);

    const results = terms.filter((t) => {
      return (
        t[0].toLowerCase().replace('-', '').includes(searchTerm) ||
        t[1].toLowerCase().replace('-', '').includes(searchTerm)
      );
    });
    setSearchResults(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase().replace('-', '');
    setSearchTerm(searchTerm);
  };

  const handleSend = (assetHash: string) => {
    dispatch(setAsset(assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };
  const handleBackBtn = () => {
    if (wallet.pendingTx) {
      dispatch(
        unsetPendingTx(
          () => {
            history.push(DEFAULT_ROUTE);
          },
          (err: Error) => {
            console.log(err);
          }
        )
      );
    } else {
      history.push(DEFAULT_ROUTE);
    }
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
          {searchResults.map((r) => (
            <ButtonAsset
              assetImgPath={
                network === 'regtest'
                  ? imgPathMapRegtest[r[1]] ?? imgPathMapRegtest['']
                  : imgPathMapMainnet[Object.keys(assets[network])[r[3]]] ?? imgPathMapMainnet['']
              }
              assetHash={Object.keys(assets[network])[r[3]]}
              assetName={r[0]}
              assetTicker={r[1]}
              assetPrecision={r[2]}
              quantity={balances[Object.keys(assets[network])[r[3]]] ?? 0}
              key={`${r[1]}_${r[3]}`}
              handleClick={({ assetHash }) => handleSend(assetHash as string)}
            />
          ))}
        </div>
      </div>
    </ShellPopUp>
  );
};

export default SelectAsset;
