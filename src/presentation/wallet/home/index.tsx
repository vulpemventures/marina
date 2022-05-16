import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import {
  RECEIVE_SELECT_ASSET_ROUTE,
  SEND_SELECT_ASSET_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import { fromSatoshiStr } from '../../utils';
import { getAssetImage } from '../../../application/utils/constants';
import type { PendingTxStep } from '../../../application/redux/reducers/transaction-reducer';
import type { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import type { Asset, AssetGetter } from '../../../domain/assets';
import { sortAssets } from '../../utils/sort';

export interface HomeProps {
  lbtcAssetHash: string;
  getAsset: AssetGetter;
  transactionStep: PendingTxStep;
  assetsBalance: BalancesByAsset;
}

const HomeView: React.FC<HomeProps> = ({
  lbtcAssetHash,
  getAsset,
  transactionStep,
  assetsBalance,
}) => {
  const history = useHistory();

  const handleAssetBalanceButtonClick = (asset: { [key: string]: string | number }) => {
    const { assetHash, assetTicker, assetPrecision } = asset;
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: {
        assetsBalance,
        assetHash,
        assetTicker,
        assetPrecision,
      },
    });
  };

  const handleReceive = () => {
    history.push(RECEIVE_SELECT_ASSET_ROUTE);
  };

  const handleSend = () => history.push(SEND_SELECT_ASSET_ROUTE);

  // return assets based on balances by asset
  const assets = (balances: BalancesByAsset) => {
    return Object.keys(balances).map((hash) => getAsset(hash));
  };

  // sorted assets
  const [sortedAssets, setSortedAssets] = useState(sortAssets(assets(assetsBalance)));

  useEffect(() => {
    setSortedAssets(sortAssets(assets(assetsBalance)));
  }, [assetsBalance]);

  useEffect(() => {
    switch (transactionStep) {
      case 'address-amount':
        history.push(SEND_ADDRESS_AMOUNT_ROUTE);
        break;
      case 'choose-fee':
        history.push(SEND_CHOOSE_FEE_ROUTE);
        break;
      case 'confirmation':
        history.push(SEND_CONFIRMATION_ROUTE);
        break;
    }
  }, []);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <div className="h-popupContent">
        <div>
          <Balance
            assetHash={lbtcAssetHash}
            assetBalance={fromSatoshiStr(assetsBalance[lbtcAssetHash] ?? 0)}
            assetImgPath={getAssetImage(lbtcAssetHash)}
            assetTicker="L-BTC"
            bigBalanceText={true}
          />

          <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />
        </div>

        <br />
        <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

        <div className="h-60">
          <ButtonList title="Assets" emptyText="You don't own any asset...">
            {sortedAssets.map(
              (
                { assetHash, name, ticker, precision }: Asset & { assetHash: string },
                index: React.Key
              ) => {
                return (
                  <ButtonAsset
                    assetImgPath={getAssetImage(assetHash)}
                    assetHash={assetHash}
                    assetName={name || 'unknown'}
                    assetTicker={ticker}
                    assetPrecision={precision}
                    quantity={assetsBalance[assetHash]}
                    key={index}
                    handleClick={handleAssetBalanceButtonClick}
                  />
                );
              }
            )}
          </ButtonList>
        </div>
      </div>
    </ShellPopUp>
  );
};

export default HomeView;
