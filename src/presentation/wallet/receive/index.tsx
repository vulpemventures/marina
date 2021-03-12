import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { AppContext } from '../../../application/store/context';
import { deriveNewAddress } from '../../../application/store/actions';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { formatAddress } from '../../utils';

const Receive: React.FC = () => {
  const history = useHistory();
  const [, dispatch] = useContext(AppContext);
  const [confidentialAddress, setConfidentialAddress] = useState('');
  const [buttonText, setButtonText] = useState('Copy');
  const [isAddressExpanded, setAddressExpanded] = useState(false);
  const handleExpand = () => setAddressExpanded(true);
  const handleBackBtn = () => history.push(DEFAULT_ROUTE);
  const handleCopy = () => {
    navigator.clipboard.writeText(confidentialAddress).then(
      () => setButtonText('Copied'),
      (err) => console.error('Could not copy text: ', err)
    );
  };

  useEffect(() => {
    dispatch(deriveNewAddress(false, (addr) => setConfidentialAddress(addr.value), console.log));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ShellPopUp
      backBtnCb={handleBackBtn}
      backgroundImagePath="/assets/images/popup/bg-receive.png"
      className="h-popupContent flex items-center justify-center bg-bottom bg-no-repeat"
      currentPage="Receive"
    >
      <div className="w-80 h-96 rounded-4xl flex flex-col items-center justify-between p-10 bg-white">
        <div className="flex flex-col items-center">
          {confidentialAddress ? (
            <QRCode size={176} value={confidentialAddress.toUpperCase()} />
          ) : (
            <div className="w-44 h-44" />
          )}
          {isAddressExpanded ? (
            <p className="mt-2.5 text-xs font-medium break-all">{confidentialAddress}</p>
          ) : (
            <>
              <p className="font-regular mt-2.5 text-lg">{formatAddress(confidentialAddress)}</p>
              <button
                className="mt-1.5 text-xs font-medium text-primary focus:outline-none"
                onClick={handleExpand}
              >
                Expand
              </button>
            </>
          )}
        </div>
        <Button className="w-3/5" onClick={handleCopy}>
          <span className="text-base antialiased font-bold">{buttonText}</span>
        </Button>
      </div>
    </ShellPopUp>
  );
};

export default Receive;
