import React, { useEffect, useContext, useState } from 'react';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';
import { AppContext } from '../../application/store/context';
import { formatAddress } from '../utils';
import ModalUnlock from '../components/modal-unlock';
import { makeid } from '../../application/marina';
import { repos } from '../../infrastructure';

const ConnectSpend: React.FC = () => {
  const [{ app, assets }] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

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

  const broker = new Broker();
  const idParam = makeid(16);
  const assetTicker = tx?.assetHash ? assets[app.network.value][tx.assetHash]?.ticker : 'Unknown';
  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleReject = () => {
    broker.port.postMessage({
      id: idParam,
      name: 'sendTransactionResponse',
      params: [false],
    });
    broker.port.onMessage.addListener(({ id, payload }) => {
      if (!payload.success && id === idParam) {
        window.close();
      }
    });
  };

  // Handle response
  broker.port.onMessage.addListener(({ id, payload }) => {
    if (id === idParam) {
      if (payload.success) {
        window.close();
      } else {
        setHasError(true);
        try {
          // Will throw error in root function scope
          handleUnlock('');
          // eslint-disable-next-line no-empty
        } catch (_) {}
      }
    }
  });

  const handleUnlock = (password: string) => {
    if (password) {
      broker.port.postMessage({
        id: idParam,
        name: 'sendTransactionResponse',
        params: [true, password],
      });
    }
    if (!hasError) return;
    // Will display generic error message 'Invalid Password'
    // TODO: bug, msg will only be displayed at second click
    throw new Error();
  };

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
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={handleUnlock}
      />
    </ShellConnectPopup>
  );
};

export default ConnectSpend;
