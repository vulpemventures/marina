import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import ShellPopUp from '../../components/shell-popup';
import Button from '../../components/button';

const Receive: React.FC = () => {
  const [buttonText, setButtonText] = useState('Copy');
  const address =
    'lq1qq0jpr2frfkwsav5qlsduncnmcvqk43yj8w0q0krx2w484kmh9cevz7szanffvcrys05dkcgql6klmyj2q52hzvrwgyrqz6u2p';

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(
      function () {
        setButtonText('Copied');
      },
      function (err) {
        console.error('Async: Could not copy text: ', err);
      }
    );
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-receive.png"
      className="h-popupContent flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive"
    >
      <div className="w-80 h-96 rounded-4xl text-center bg-white">
        <h1 className="text-2xl font-medium my-2.5">Liquid Bitcoin</h1>
        <img
          className="w-11 mt-0.5 block mx-auto mb-4"
          src="assets/images/liquid-assets/liquid-btc.svg"
          alt="liquid bitcoin logo"
        />
        <div className="flex flex-col items-center">
          <QRCode size={144} value={address.toUpperCase()} />
          <p className="mt-2 mb-8 text-xs">
            {`${address.substring(0, 9)}...${address.substring(
              address.length - 9,
              address.length
            )}`}
          </p>
        </div>
        <Button onClick={handleCopy}>
          <span className="text-base antialiased font-bold">{buttonText}</span>
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default Receive;
