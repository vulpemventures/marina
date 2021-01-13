import React, { useState } from 'react';
import cx from 'classnames';
import Balance from '../../components/balance';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { SEND_CONFIRMATION_ROUTE } from '../../routes/constants';
import { useHistory } from 'react-router';

const ChooseFee: React.FC = () => {
  const history = useHistory();
  const [feeCurrency, setFeeCurrency] = useState<'L-BTC' | 'USDt'>('L-BTC');
  const [feeLevel, setFeeLevel] = useState<string>('50');
  const [isWarningFee] = useState<boolean>(true);
  const handleConfirm = () => {
    history.push({
      pathname: SEND_CONFIRMATION_ROUTE,
      state: {
        feeCurrency,
      },
    });
  };

  const warningFee = (
    <div className="flex flex-row gap-2 mt-5">
      <img className="w-4 h-4" src="assets/images/marina-logo.svg" alt="warning" />
      <p className="font-regular text-xs text-left">
        9.99862 L-BTC will be sent in order to cover fee
      </p>
    </div>
  );

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
    >
      <Balance className="mt-4" liquidBitcoinBalance={0.005} fiatBalance={120} fiatCurrency="$" />

      <div className="w-48 mx-auto border-b-0.5 border-graySuperLight pt-2 mb-6"></div>

      <p className="text-sm font-medium">I pay fee in:</p>

      <div className="flex flex-row justify-center gap-0.5 mx-auto w-11/12 mt-2">
        <Button
          className="flex-1"
          isOutline={true}
          onClick={() => setFeeCurrency('L-BTC')}
          roundedMd={true}
          textBase={true}
        >
          L-BTC
        </Button>
        <Button
          className="flex-1"
          onClick={() => setFeeCurrency('USDt')}
          roundedMd={true}
          textBase={true}
        >
          USDt
        </Button>
      </div>

      {feeCurrency === 'L-BTC' && (
        <div
          className={cx({
            'track-50': feeLevel === '50',
            'track-100': feeLevel === '100',
          })}
        >
          <div className="text-primary flex flex-row justify-between mt-12 text-sm antialiased font-bold">
            <span>Slow</span>
            <span>Average</span>
            <span>Fast</span>
          </div>
          <input
            className="bg-graySuperLight focus:outline-none w-11/12"
            min="0"
            max="100"
            onChange={(event) => setFeeLevel(event.target.value)}
            step="50"
            type="range"
          />
          <p className="text-gray mt-5 text-xs font-medium text-left">0.00000144 L-BTC</p>
          {isWarningFee && warningFee}
        </div>
      )}

      {feeCurrency === 'USDt' && (
        <>
          <div className="flex flex-row items-baseline justify-between mt-12">
            <span className="text-lg font-medium">Fee:</span>
            <span className="font-regular mr-6 text-base">0.00138 USDt *</span>
          </div>
          {isWarningFee && warningFee}
          <p className="text-primary mt-3.5 text-xs font-medium text-left">
            * Fee paid with Liquid taxi 🚕
          </p>
        </>
      )}

      <Button className="bottom-20 right-8 absolute" onClick={handleConfirm}>
        Confirm
      </Button>
    </ShellPopUp>
  );
};
export default ChooseFee;
