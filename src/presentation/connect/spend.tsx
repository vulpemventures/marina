import React, { useRef, useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import { formatAddress } from '../utils';
import ModalUnlock from '../components/modal-unlock';
import { debounce } from 'lodash';
import WindowProxy from '../../application/proxy';
import { useSelector } from 'react-redux';
import {
  connectWithConnectData,
  WithConnectDataProps,
} from '../../application/redux/containers/with-connect-data.container';
import { RootReducerState } from '../../domain/common';

const ConnectSpend: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const app = useSelector((state: RootReducerState) => state.app);
  const assets = useSelector((state: RootReducerState) => state.assets);

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const windowProxy = new WindowProxy();

  const assetTicker = connectData.tx?.assetHash
    ? assets[app.network][connectData.tx.assetHash]?.ticker
    : 'Unknown';
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
    if (!password || password.length === 0) return;

    try {
      await windowProxy.proxy('SEND_TRANSACTION_RESPONSE', [true, password]);
      window.close();
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    handleModalUnlockClose();
  };

  const debouncedHandleUnlock = useRef(
    debounce(handleUnlock, 2000, { leading: true, trailing: false })
  ).current;

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{connectData.tx?.hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to spend</p>

          <div className="container flex justify-between mt-16">
            <span className="text-lg font-medium">{connectData.tx?.amount}</span>
            <span className="text-lg font-medium">{assetTicker}</span>
          </div>

          <div className="container flex items-baseline justify-between mt-4">
            <span className="mr-2 text-lg font-medium">To: </span>
            <span className="font-small text-sm break-all">
              {formatAddress(connectData.tx?.recipient ?? '')}
            </span>
          </div>

          <div className="bottom-24 container absolute right-0 flex justify-between">
            <Button isOutline={true} onClick={handleReject} textBase={true}>
              Reject
            </Button>
            <Button onClick={handleUnlockModalOpen} textBase={true}>
              Accept
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-lg font-medium">Oops, Something went wrong...</h1>
          <p className="font-small mt-4 text-sm">{error}</p>
          <img className="mx-auto my-10" src="/assets/images/cross.svg" alt="error" />
          <Button
            className="w-36 container mx-auto mt-10"
            onClick={handleUnlockModalOpen}
            textBase={true}
          >
            Unlock
          </Button>
        </>
      )}
      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={debouncedHandleUnlock}
      />
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectSpend);
