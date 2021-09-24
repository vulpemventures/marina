import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import {
  BACKUP_UNLOCK_ROUTE,
  RECEIVE_ROUTE,
  SELECT_ASSET_ROUTE,
  SEND_ADDRESS_AMOUNT_ROUTE,
  SEND_CHOOSE_FEE_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import SaveMnemonicModal from '../../components/modal-save-mnemonic';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import { fromSatoshiStr } from '../../utils';
import { imgPathMapMainnet, imgPathMapRegtest } from '../../../application/utils';
import { PendingTxStep } from '../../../application/redux/reducers/transaction-reducer';
import { BalancesByAsset } from '../../../application/redux/selectors/balance.selector';
import { AssetGetter } from '../../../domain/assets';
import { Network } from '../../../domain/network';
import browser from 'webextension-polyfill';

export interface HomeProps {
  lbtcAssetHash: string;
  network: Network;
  getAsset: AssetGetter;
  transactionStep: PendingTxStep;
  assetsBalance: BalancesByAsset;
  isWalletVerified: boolean;
}

const HomeView: React.FC<HomeProps> = ({
  lbtcAssetHash,
  getAsset,
  transactionStep,
  assetsBalance,
  network,
  isWalletVerified
}) => {
  const history = useHistory();
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);

  const handleAssetBalanceButtonClick = (asset: { [key: string]: string | number }) => {
    const { assetHash, assetTicker, assetPrecision } = asset;
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: {
        assetsBalance,
        assetHash,
        assetTicker,
        assetPrecision
      }
    });
  };

  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);

  const handleSaveMnemonicConfirm = async () => {
    await browser.tabs.create({ url: `home.html#${BACKUP_UNLOCK_ROUTE}` });
  };

  const handleReceive = () => {
    if (!isWalletVerified) {
      showSaveMnemonicModal(true);
    } else {
      history.push(RECEIVE_ROUTE);
    }
  };

  const handleSend = () => history.push(SELECT_ASSET_ROUTE);

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
      <div className="h-popupContent flex flex-col justify-between">
        <div>
          <Balance
            assetHash={lbtcAssetHash}
            assetBalance={fromSatoshiStr(assetsBalance[lbtcAssetHash] ?? 0)}
            assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
            assetTicker="L-BTC"
            bigBalanceText={true}
          />

          <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />
        </div>

        <div>
          <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />
          <ButtonList title="Assets" emptyText="You don't own any asset...">
            {Object.entries(assetsBalance)
              .sort(([a], [b]) => (a === lbtcAssetHash ? -Infinity : Infinity))
              .map(([asset, balance]) => {
                const { ticker, precision, name } = getAsset(asset);
                return (
                  <ButtonAsset
                    assetImgPath={
                      network === 'regtest'
                        ? imgPathMapRegtest[ticker] ?? imgPathMapRegtest['']
                        : imgPathMapMainnet[asset] ?? imgPathMapMainnet['']
                    }
                    assetHash={asset}
                    assetName={name || 'unknown'}
                    assetTicker={ticker}
                    assetPrecision={precision}
                    quantity={balance}
                    key={asset}
                    handleClick={handleAssetBalanceButtonClick}
                  />
                );
              })}
          </ButtonList>
        </div>
      </div>

      <SaveMnemonicModal
        isOpen={isSaveMnemonicModalOpen}
        handleClose={handleSaveMnemonicClose}
        handleConfirm={handleSaveMnemonicConfirm}
      />
    </ShellPopUp>
  );
};

export default HomeView;
