import React from 'react';
import Button from '../../../components/button';

interface Props {
  liquidBitcoinBalance: number;
  fiatBalance: number;
  fiatCurrency: '$' | '€';
}

/**
 * Main top component of home wallet screen
 */
const BalanceSendReceive: React.FC<Props> = ({
  liquidBitcoinBalance,
  fiatBalance,
  fiatCurrency,
}) => {
  let formattedFiatBalance;
  if (fiatCurrency === '$') {
    formattedFiatBalance = `$${fiatBalance} USD`;
  } else if (fiatCurrency === '€') {
    formattedFiatBalance = `${fiatBalance} EUR`;
  }

  return (
    <div>
      <img
        className="w-11 mt-0.5 block mx-auto mb-2"
        src="assets/images/liquid-assets/liquid-btc.svg"
        alt="liquid bitcoin logo"
      />
      <div className="mb-7">
        <p className="text-grayDark text-3xl font-medium">{liquidBitcoinBalance} L-BTC</p>
        <p className="text-grayLight text-sm font-medium">{formattedFiatBalance}</p>
      </div>
      <div className="mb-11 flex flex-row justify-center space-x-4">
        <Button className="flex flex-row justify-center w-2/5">
          <img className="w-4 mr-2" src="assets/images/receive.svg" alt="receive" />
          <span className="text-base antialiased font-bold">Receive</span>
        </Button>
        <Button className="flex flex-row justify-center w-2/5">
          <img className="w-4 mr-2" src="assets/images/send.svg" alt="send" />
          <span className="text-base antialiased font-bold">Send</span>
        </Button>
      </div>
    </div>
  );
};

export default BalanceSendReceive;
