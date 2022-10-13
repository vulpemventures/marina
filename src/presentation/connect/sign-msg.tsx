import React, { useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import type { WithConnectDataProps } from '../../application/redux/containers/with-connect-data.container';
import { connectWithConnectData } from '../../application/redux/containers/with-connect-data.container';
import { signMessageWithMnemonic } from '../../application/utils/message';
import { useSelector } from 'react-redux';
import type { RootReducerState } from '../../domain/common';
import PopupWindowProxy from './popupWindowProxy';
import type { SignedMessage } from 'marina-provider';
import type { NetworkString } from 'ldk';
import { networks } from 'ldk';
import {
  INVALID_PASSWORD_ERROR,
  SOMETHING_WENT_WRONG_ERROR,
} from '../../application/utils/constants';
import { decrypt } from '../../application/utils/crypto';
import ButtonsAtBottom from '../components/buttons-at-bottom';

function signMsgWithPassword(
  message: string,
  encryptedMnemonic: string,
  password: string,
  network: NetworkString
): Promise<SignedMessage> {
  try {
    const mnemonic = decrypt(encryptedMnemonic, password);
    return signMessageWithMnemonic(message, mnemonic, networks[network]);
  } catch (e: any) {
    throw new Error(INVALID_PASSWORD_ERROR);
  }
}

export interface SignMessagePopupResponse {
  accepted: boolean;
  signedMessage?: SignedMessage;
}

const ConnectSignMsg: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const network = useSelector((state: RootReducerState) => state.app.network);
  const encryptedMnemonic = useSelector(
    (state: RootReducerState) => state.wallet.encryptedMnemonic
  );

  const popupWindowProxy = new PopupWindowProxy<SignMessagePopupResponse>();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedMessage?: SignedMessage) => {
    return popupWindowProxy.sendResponse({ data: { accepted, signedMessage } });
  };

  const handleReject = async () => {
    try {
      await sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handleUnlock = async (password: string) => {
    if (!password || password.length === 0) return;

    try {
      if (!connectData.msg || !connectData.msg.message) throw new Error('missing message to sign');

      // SIGN THE MESSAGE WITH FIRST ADDRESS FROM HD WALLET
      const signedMsg = await signMsgWithPassword(
        connectData.msg.message,
        encryptedMnemonic,
        password,
        network
      );
      await sendResponseMessage(true, signedMsg);
      window.close();
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    handleModalUnlockClose();
  };

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Sign message"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{connectData.msg?.hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to sign a message</p>

          <p className="text-small mt-2 font-medium"> {connectData.msg?.message}</p>

          <ButtonsAtBottom>
            <Button isOutline={true} onClick={handleReject} textBase={true}>
              Reject
            </Button>
            <Button onClick={handleUnlockModalOpen} textBase={true}>
              Accept
            </Button>
          </ButtonsAtBottom>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
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
        handleUnlock={handleUnlock}
      />
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectSignMsg);
