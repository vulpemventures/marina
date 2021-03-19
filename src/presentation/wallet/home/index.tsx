import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { browser } from 'webextension-polyfill-ts';
import {
  RECEIVE_ROUTE,
  SELECT_ASSET_ROUTE,
  SEND_CONFIRMATION_ROUTE,
  TRANSACTIONS_ROUTE,
} from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ReminderSaveMnemonicModal from '../../components/modal-reminder-save-mnemonic';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';
import useLottieLoader from '../../hooks/use-lottie-loader';
import { AppContext } from '../../../application/store/context';
import { flush, updateUtxosAssetsBalances } from '../../../application/store/actions';
import { createDevState } from '../../../../test/dev-state';
import { fromSatoshi } from '../../utils';
import {
  imgPathMapMainnet,
  imgPathMapRegtest,
  lbtcAssetByNetwork,
} from '../../../application/utils';
import { waitAtLeast } from '../../../application/utils/common';

const Home: React.FC = () => {
  const history = useHistory();
  const [{ app, assets, transaction, wallets }, dispatch] = useContext(AppContext);
  const [assetsBalance, setAssetsBalance] = useState<{ [hash: string]: number }>({});
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  let buttonList;

  const handleAssetBalanceButtonClick = (asset: { [key: string]: string }) => {
    const { assetHash, assetTicker } = asset;
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: {
        assetsBalance,
        assetHash,
        assetTicker,
      },
    });
  };

  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => history.push(SELECT_ASSET_ROUTE);

  // Populate ref div with svg animation
  const mermaidLoaderRef = React.useRef(null);
  useLottieLoader(mermaidLoaderRef, '/assets/animations/mermaid-loader.json');

  useEffect(() => {
    if (process.env.SKIP_ONBOARDING) {
      dispatch(createDevState());
    }
    // Update utxos set, owned assets and balances
    // Wait at least 800ms to avoid flickering
    waitAtLeast(
      800,
      new Promise((resolve, reject) => {
        dispatch(
          updateUtxosAssetsBalances(
            (balances) => resolve(balances),
            (error) => reject(error.message)
          )
        );
      })
    )
      .then(setAssetsBalance)
      .catch(console.error);
    // Flush last sent tx
    if (transaction.asset !== '') {
      dispatch(flush());
      browser.browserAction.setBadgeText({ text: '' }).catch((ignore) => ({}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If extension was closed when a tx is pending then navigate to confirmation route
  if (wallets[0].pendingTx) {
    history.push(SEND_CONFIRMATION_ROUTE);
    return <></>;
  }

  if (Object.keys(assetsBalance).length === 0) {
    // Lottie mermaid animation
    return <div className="flex items-center justify-center h-screen p-8" ref={mermaidLoaderRef} />;
  } else {
    // Generate list of Asset/Balance buttons
    buttonList = Object.entries(assets[app.network.value] || {}).map(([hash, { name, ticker }]) => {
      return (
        <ButtonAsset
          assetImgPath={
            app.network.value === 'regtest'
              ? imgPathMapRegtest[ticker] ?? imgPathMapRegtest['']
              : imgPathMapMainnet[hash] ?? imgPathMapMainnet['']
          }
          assetHash={hash}
          assetName={name}
          assetTicker={ticker}
          quantity={assetsBalance[hash] ?? 0}
          key={hash}
          handleClick={handleAssetBalanceButtonClick}
        />
      );
    });
  }

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
      refreshCb={setAssetsBalance}
    >
      <Balance
        assetBalance={fromSatoshi(assetsBalance[lbtcAssetByNetwork(app.network.value)] ?? 0)}
        assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
        assetTicker="L-BTC"
        bigBalanceText={true}
        fiatBalance={120}
        fiatCurrency="$"
      />

      <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5" />

      <ButtonList title="Assets" type="assets">
        {buttonList}
      </ButtonList>

      <ReminderSaveMnemonicModal
        isOpen={isSaveMnemonicModalOpen}
        handleClose={handleSaveMnemonicClose}
        handleConfirm={handleSaveMnemonicConfirm}
      />
    </ShellPopUp>
  );
};

export default Home;
