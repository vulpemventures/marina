import React from 'react';
import Button from '../components/button';
import ShellPopUp from '../components/shell-popup';

const ConnectSpend: React.FC = () => {
  const assetTicker = 'L-BTC';
  const assetAmount = '0.007';
  const websiteTitle = 'Sideshift.ai';
  const handleReject = () => console.log('reject');
  const handleAccept = () => console.log('accept');

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      <h1 className="mt-8 text-2xl font-medium">{websiteTitle}</h1>

      <p className="mt-4 text-base font-medium">Requests you to spend</p>

      <div className="container flex justify-between mt-16">
        <span className="text-lg font-medium">{assetAmount}</span>
        <span className="text-lg font-medium">{assetTicker}</span>
      </div>

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={handleAccept} textBase={true}>
          Accept
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default ConnectSpend;
