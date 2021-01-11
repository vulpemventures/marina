import React from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';

interface LocationState {
  feeCurrency: string;
}

const Confirmation: React.FC = () => {
  const { state } = useLocation<LocationState>();
  const feeCurrency = state.feeCurrency || 'L-BTC';
  const handleSend = () => console.log('Make it rain!');

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Confirmation"
    >
      {feeCurrency === 'L-BTC' && (
        <>
          <h1 className="text-2xl">Send Liquid Bitcoin</h1>
          <img
            className="w-11 mt-0.5 block mx-auto mb-2"
            src="assets/images/liquid-assets/liquid-btc.svg"
            alt="liquid bitcoin logo"
          />
        </>
      )}

      {feeCurrency === 'USDt' && (
        <>
          <h1 className="text-2xl">Send Tether</h1>
          <img
            className="w-11 block mx-auto mt-1 mb-2"
            src="assets/images/liquid-assets/liquid-tether.png"
            alt="liquid tether logo"
          />
        </>
      )}

      <div className="px-3 mt-3">
        <h2 className="text-lg font-medium text-left">To</h2>
        <p className="font-regular text-sm text-left break-all">
          lq1qqtgupd8zehre9ae89pmt5xnfq4fnxr5s0rlhh03kq9cs2rz57yc0nkr00s6yqhkcs4hwrunkxpswhnc4czsec9y78dkc3jlkj
        </p>
      </div>

      <div className="bg-gradient-to-r from-secondary to-primary flex flex-row items-center justify-between h-12 px-4 mt-4 rounded-full">
        <span className="text-lg font-medium">Amount</span>
        <span className="text-base font-medium text-white">0.007 {feeCurrency}</span>
      </div>

      <div className="flex flex-row justify-between px-3 mt-10">
        <span className="text-lg font-medium">Fee</span>
        <span className="font-regular text-base">0.00000138 L-BTC</span>
      </div>

      <Button className="bottom-20 right-8 absolute" onClick={handleSend}>
        Send
      </Button>
    </ShellPopUp>
  );
};

export default Confirmation;
