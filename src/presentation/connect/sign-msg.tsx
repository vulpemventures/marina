import React, { useRef, useEffect, useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import { repos } from '../../infrastructure';
import { debounce } from 'lodash';
import WindowProxy from '../../application/proxy';

const ConnectSignMsg: React.FC = () => {
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [msg, setMsg] = useState<
    | {
        hostname?: string;
        message?: string;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    void (async (): Promise<void> => {
      const network = (await repos.app.getApp()).network.value;
      const data = await repos.connect.getConnectData();
      setMsg(data[network].msg);
    })();
  }, []);

  const windowProxy = new WindowProxy();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleReject = async () => {
    try {
      await windowProxy.proxy('SIGN_MESSAGE_RESPONSE', [false]);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handleUnlock = async (password: string) => {
    if (!password || password.length === 0) return;

    try {
      await windowProxy.proxy('SIGN_MESSAGE_RESPONSE', [true, password]);
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
          <h1 className="mt-8 text-2xl font-medium break-all">{msg?.hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to sign a message</p>

          <p className="text-small mt-2 font-medium"> {msg?.message}</p>

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

export default ConnectSignMsg;
