import React from 'react';
import { useHistory } from 'react-router';
import ButtonAsset from '../../components/button-asset';
import ShellPopUp from '../../components/shell-popup';
import { TRANSACTIONS_ROUTE } from '../../routes/constants';
import BalanceSendReceive from '../components/balance-send-receive';

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
    <ShellPopUp hasBackBtn={false}>
      <BalanceSendReceive liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

      <div>
        <h2 className="my-2 text-lg font-medium text-left text-white">Assets</h2>
        <div className="h-64 space-y-4 overflow-y-scroll">
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
        </div>
      </div>
    </ShellPopUp>
  );
};

export default Home;
