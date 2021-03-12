import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { DEFAULT_ROUTE, SEND_ADDRESS_AMOUNT_ROUTE } from '../../routes/constants';
import ButtonAsset from '../../components/button-asset';
import InputIcon from '../../components/input-icon';
import ShellPopUp from '../../components/shell-popup';
import { AppContext } from '../../../application/store/context';
import { getAllAssetBalances, setAsset, unsetPendingTx } from '../../../application/store/actions';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { fromSatoshi } from '../../utils';

const SelectAsset: React.FC = () => {
  const history = useHistory();
  const [{ app, assets, wallets }, dispatch] = useContext(AppContext);
  const [assetsBalance, setAssetsBalance] = useState<{ [hash: string]: number }>({});

  // Filter assets
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<
    [assetName: string, assetTicker: string, index: number][]
  >([]);

  useEffect(() => {
    dispatch(
      getAllAssetBalances(
        (balances) => setAssetsBalance(balances),
        (error) => console.log(error)
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const terms: [name: string, ticker: string, index: number][] = Object.entries(
      assets[app.network.value]
    ).map(([hash, { name, ticker }], index) => [name, ticker, index]);

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

  const handleSend = ({ assetHash }: { [assetHash: string]: string }) => {
    dispatch(setAsset(assetHash));
    history.push(SEND_ADDRESS_AMOUNT_ROUTE);
  };
  const handleBackBtn = () => {
    if (wallets[0].pendingTx) {
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
                app.network.value === 'regtest'
                  ? imgPathMapRegtest[r[1]] ?? imgPathMapRegtest['']
                  : imgPathMapMainnet[Object.keys(assets[app.network.value])[r[2]]] ??
                    imgPathMapMainnet['']
              }
              assetHash={Object.keys(assets[app.network.value])[r[2]]}
              assetName={r[0]}
              assetTicker={r[1]}
              quantity={fromSatoshi(
                assetsBalance[Object.keys(assets[app.network.value])[r[2]]] ?? 0
              )}
              key={`${r[1]}_${r[2]}`}
              handleClick={handleSend}
            />
          ))}
        </div>
      </div>
    </ShellPopUp>
  );
};

export default SelectAsset;
