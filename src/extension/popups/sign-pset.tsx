import React, { useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import PopupWindowProxy from './popupWindowProxy';
import { SOMETHING_WENT_WRONG_ERROR } from '../../constants';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import {
  appRepository,
  useSelectPopupHostname,
  useSelectPopupPsetToSign,
  walletRepository,
} from '../../infrastructure/storage/common';
import { SignerService } from '../../domain/signer';
import { popupResponseMessage } from '../../domain/message';
import { Pset } from 'liquidjs-lib';

export interface SignTransactionPopupResponse {
  accepted: boolean;
  signedPset?: string;
}

const ConnectSignTransaction: React.FC = () => {
  const popupWindowProxy = new PopupWindowProxy<SignTransactionPopupResponse>();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const psetToSign = useSelectPopupPsetToSign();
  const hostname = useSelectPopupHostname();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedPset?: string) => {
    return popupWindowProxy.sendResponse(popupResponseMessage({ accepted, signedPset }));
  };

  const rejectSignRequest = () => {
    try {
      sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const signTx = async (password: string) => {
    try {
      if (!psetToSign) throw new Error('no pset to sign');
      if (!password || password.length === 0) throw new Error('Need password');
      const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
      const signedPset = await signer.signPset(Pset.fromBase64(psetToSign));
      sendResponseMessage(true, signedPset.toBase64());
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
      currentPage="Sign PSET"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to spend</p>

          <p className="text-small mt-4 font-medium">
            {' '}
            <b>WARNING</b> This transaction could potentially spend all of your funds.
          </p>

          <ButtonsAtBottom>
            <Button isOutline={true} onClick={rejectSignRequest} textBase={true}>
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
      {psetToSign && (
        <ModalUnlock
          isModalUnlockOpen={isModalUnlockOpen}
          handleModalUnlockClose={handleModalUnlockClose}
          handleUnlock={signTx}
        />
      )}
    </ShellConnectPopup>
  );
};

export default ConnectSignTransaction;
