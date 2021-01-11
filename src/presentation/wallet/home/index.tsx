import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { ErrorBoundary } from 'react-error-boundary';
import { RECEIVE_ROUTE, SELECT_ASSET_ROUTE, TRANSACTIONS_ROUTE } from '../../routes/constants';
import Balance from '../../components/balance';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ErrorFallback from '../../components/error-fallback';
import ModalConfirm from '../../components/modal-confirm';
import ShellPopUp from '../../components/shell-popup';
import ButtonsSendReceive from '../../components/buttons-send-receive';

const Home: React.FC = () => {
  const history = useHistory();
  const handleClick = (assetTicker: string) => {
    history.push({
      pathname: TRANSACTIONS_ROUTE,
      state: {
        assetTicker,
      },
    });
  };

  // Save mnemonic modal
  const [isSaveMnemonicModalOpen, showSaveMnemonicModal] = useState(false);
  const handleSaveMnemonicClose = () => showSaveMnemonicModal(false);
  const handleSaveMnemonicConfirm = () => history.push(RECEIVE_ROUTE);

  // TODO: Show modal conditionnaly base on state
  // blocked by https://github.com/vulpemventures/marina/issues/15
  const handleReceive = () => showSaveMnemonicModal(true);
  const handleSend = () => history.push(SELECT_ASSET_ROUTE);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <Balance
        bigBalanceText={true}
        liquidBitcoinBalance={0.005}
        fiatBalance={120}
        fiatCurrency="$"
      />

      <ButtonsSendReceive onReceive={handleReceive} onSend={handleSend} />

      <div className="w-48 mx-auto border-b-0.5 border-white pt-1.5"></div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <ButtonList title="Assets" type="assets">
          <ButtonAsset
            assetImgPath="assets/images/liquid-assets/liquid-btc.svg"
            assetName="Liquid Bitcoin"
            assetTicker="L-BTC"
            quantity={1}
            onClick={() => handleClick('L-BTC')}
          />
          <ButtonAsset
            assetImgPath="assets/images/liquid-assets/liquid-cad.png"
            assetName="Liquid CAD"
            assetTicker="LCAD"
            quantity={10}
            onClick={() => handleClick('LCAD')}
          />
          <ButtonAsset
            assetImgPath="assets/images/liquid-assets/liquid-tether.png"
            assetName="Tether"
            assetTicker="USDt"
            quantity={10}
            onClick={() => handleClick('USDt')}
          />
          <ButtonAsset
            assetImgPath="assets/images/liquid-assets/question-mark.svg"
            assetName="Vulpem"
            assetTicker="VLP"
            quantity={3}
            onClick={() => handleClick('VLP')}
          />
          <ButtonAsset
            assetImgPath="assets/images/liquid-assets/question-mark.svg"
            assetName="Unregistered Asset"
            assetTicker="UA"
            quantity={3}
            onClick={() => handleClick('UA')}
          />
        </ButtonList>
      </ErrorBoundary>

      <ModalConfirm
        btnTextClose="Cancel"
        btnTextConfirm="Save"
        isOpen={isSaveMnemonicModalOpen}
        onClose={handleSaveMnemonicClose}
        onConfirm={handleSaveMnemonicConfirm}
        title="Save your mnemonic"
      >
        <p className="text-base text-left">Save your mnemonic phrase to receive or send funds</p>
      </ModalConfirm>
    </ShellPopUp>
  );
};

export default Home;
