import React from 'react';
import { useHistory } from 'react-router';
import ButtonAsset from '../../components/button-asset';
import ButtonList from '../../components/button-list';
import ShellPopUp from '../../components/shell-popup';
import { TRANSACTIONS_ROUTE } from '../../routes/constants';
import BalanceSendReceive from '../components/balance-send-receive';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from '../../components/error-fallback';

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

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-home.png"
      className="container mx-auto text-center bg-bottom bg-no-repeat"
      hasBackBtn={false}
    >
      <BalanceSendReceive liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

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
    </ShellPopUp>
  );
};

export default Home;
