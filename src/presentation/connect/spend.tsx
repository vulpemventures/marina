import React, { useRef, useContext, useEffect, useState } from 'react';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';
import { AppContext } from '../../application/store/context';
import { formatAddress } from '../utils';
import ModalUnlock from '../components/modal-unlock';
import { repos } from '../../infrastructure';
import { debounce } from 'lodash';
import WindowProxy from '../../application/proxy';

const ConnectSpend: React.FC = () => {
  const [{ app, assets }] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [tx, setTx] = useState<
    | {
        hostname?: string;
        amount?: string;
        assetHash?: string;
        recipient?: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    void (async (): Promise<void> => {
      const network = (await repos.app.getApp()).network.value;
      const data = await repos.connect.getConnectData();
      setTx(data[network].tx);
    })();
  }, []);

  const windowProxy = new WindowProxy();

  const assetTicker = tx?.assetHash ? assets[app.network.value][tx.assetHash]?.ticker : 'Unknown';
  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleReject = async () => {
    try {
      await windowProxy.proxy('SEND_TRANSACTION_RESPONSE', [false]);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handleUnlock = async (password: string) => {
    if (!password || password.length === 0) {
      setError('Password cannot be empty');
      return;
    }

    try {
      await windowProxy.proxy('SEND_TRANSACTION_RESPONSE', [true, password]);
      window.close();
    } catch (e) {
      console.error(e);
    }
  };

  const debouncedHandleUnlock = useRef(
    debounce(handleUnlock, 2000, { leading: true, trailing: false })
  ).current;

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{tx?.hostname}</h1>

      <p className="mt-4 text-base font-medium">Requests you to spend</p>

      <div className="container flex justify-between mt-16">
        <span className="text-lg font-medium">{tx?.amount}</span>
        <span className="text-lg font-medium">{assetTicker}</span>
      </div>

      <div className="container flex items-baseline justify-between mt-4">
        <span className="mr-2 text-lg font-medium">To: </span>
        <span className="font-small text-sm break-all">{formatAddress(tx?.recipient ?? '')}</span>
      </div>

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={handleUnlockModalOpen} textBase={true}>
          Accept
        </Button>
      </div>

      <ModalUnlock
        error={error}
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={debouncedHandleUnlock}
      />
    </ShellConnectPopup>
  );
};

export default ConnectSpend;
