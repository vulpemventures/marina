import React, { useCallback, useEffect, useState } from 'react';
import Button from '../components/button';
import Broker from '../../application/content-script';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import { repos } from '../../infrastructure';
import { makeid } from '../../application/marina';
import { debounce } from '../../application/utils/debounce';

const ConnectSpendPset: React.FC = () => {
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

  const broker = new Broker();
  const idParam = makeid(16);
  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleReject = () => {
    broker.port.postMessage({ id: idParam, name: 'signTransactionResponse', params: [false] });
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
        setError('Invalid password');
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
      // Get tx from repo and decode it
      //const connectDataByNetwork = await repos.connect.getConnectData()
      //const decodedTx = decodePset(tx);
      //console.log('decodedTx', decodedTx);

      broker.port.postMessage({
        id: idParam,
        name: 'signTransactionResponse',
        params: [true, password],
      });
    }
    if (!error) return;
    // Will display generic error message 'Invalid Password'
    // TODO: bug, msg will only be displayed at second click
    throw new Error();
  };

  const debouncedHandleUnlock = useCallback(debounce(handleUnlock, 2000, true), []);

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">{tx?.hostname}</h1>

      <p className="mt-4 text-base font-medium">We are going to spend your funds, are you sure?</p>

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

export default ConnectSpendPset;
