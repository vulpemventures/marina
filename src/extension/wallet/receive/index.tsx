import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QRCode from 'qrcode.react';
import Button from '../../components/button';
import ShellPopUp from '../../components/shell-popup';
import { formatAddress } from '../../utility';
import { DEFAULT_ROUTE } from '../../routes/constants';
import { AccountFactory, MainAccount, MainAccountTest } from '../../../application/account';
import { useStorageContext } from '../../context/storage-context';

const ReceiveView: React.FC = () => {
  const { appRepository, walletRepository } = useStorageContext();
  const history = useHistory();
  const [confidentialAddress, setConfidentialAddress] = useState('');
  const [buttonText, setButtonText] = useState('Copy');
  const [isAddressExpanded, setAddressExpanded] = useState(false);
  const handleExpand = () => setAddressExpanded(true);
  const handleBackBtn = () => history.replace(DEFAULT_ROUTE);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(confidentialAddress);
    setButtonText('Copied');
  };

  useEffect(() => {
    (async () => {
      if (confidentialAddress !== '') return; // address is already generated
      const network = await appRepository.getNetwork();
      if (!network) throw new Error('Network is not set');
      const accountName = network === 'liquid' ? MainAccount : MainAccountTest;
      const accountFactory = await AccountFactory.create(walletRepository);
      const mainAccount = await accountFactory.make(network, accountName);
      const addr = await mainAccount.getNextAddress(false);
      if (addr.confidentialAddress) setConfidentialAddress(addr.confidentialAddress);
      else console.warn('something went wrong while generating address: ', JSON.stringify(addr));
    })().catch(console.error);
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
            // TODO: altough BIP173 suggest to use uppercase when encoding as QRCODE image
            // Blockstream Green unfortunately do not recognize BLECH32 uppercase as valid
            // https://t.me/blockstream_green/17583
            <QRCode size={176} value={confidentialAddress.toLowerCase()} />
          ) : (
            <div className="w-44 h-44" />
          )}
          {isAddressExpanded ? (
            <p className="mt-2.5 text-xs font-medium break-all">{confidentialAddress}</p>
          ) : (
            <>
              <p id="address" className="font-regular mt-2.5 text-lg">
                {formatAddress(confidentialAddress)}
              </p>
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

export default ReceiveView;
