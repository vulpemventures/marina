import React, { useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import PopupWindowProxy from './popupWindowProxy';
import type { NetworkString, SignedMessage } from 'marina-provider';
import { INVALID_PASSWORD_ERROR, SOMETHING_WENT_WRONG_ERROR } from '../../constants';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import { decrypt, signMessageWithMnemonic } from '../../utils';
import { networks } from 'liquidjs-lib';
import {
  useSelectEncryptedMnemonic,
  useSelectNetwork,
  useSelectPopupHostname,
  useSelectPopupMessageToSign,
} from '../../infrastructure/storage/common';
import { popupResponseMessage } from '../../domain/message';

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

const ConnectSignMsg: React.FC = () => {
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const messageToSign = useSelectPopupMessageToSign();
  const hostname = useSelectPopupHostname();
  const encryptedMnemonic = useSelectEncryptedMnemonic();
  const network = useSelectNetwork();

  const popupWindowProxy = new PopupWindowProxy<SignMessagePopupResponse>();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedMessage?: SignedMessage) => {
    return popupWindowProxy.sendResponse(popupResponseMessage({ accepted, signedMessage }));
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
    if (!password || password.length === 0 || !messageToSign || !encryptedMnemonic || !network)
      return;

    try {
      // SIGN THE MESSAGE WITH FIRST ADDRESS FROM HD WALLET
      const signedMsg = await signMsgWithPassword(
        messageToSign,
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
          <h1 className="mt-8 text-2xl font-medium break-all">{hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to sign a message</p>

          <p className="text-small mt-2 font-medium"> {messageToSign}</p>

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

export default ConnectSignMsg;