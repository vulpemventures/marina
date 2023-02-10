import React, { useState } from 'react';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import { SOMETHING_WENT_WRONG_ERROR } from '../../constants';
import { BlinderService } from '../../domain/blinder';
import { popupResponseMessage } from '../../domain/message';
import { SignerService } from '../../domain/signer';
import type { SpendParameters } from '../../infrastructure/repository';
import {
  appRepository,
  useSelectAllAssets,
  useSelectPopupSpendParameters,
  walletRepository,
} from '../../infrastructure/storage/common';
import { makeSendPset } from '../../utils';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import ModalUnlock from '../components/modal-unlock';
import ShellConnectPopup from '../components/shell-connect-popup';
import { fromSatoshi, formatAddress } from '../utility';
import { extractErrorMessage } from '../utility/error';
import PopupWindowProxy from './popupWindowProxy';

export interface SpendPopupResponse {
  accepted: boolean;
  signedTxHex?: string;
}

const ConnectSpend: React.FC = () => {
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const popupWindowProxy = new PopupWindowProxy<SpendPopupResponse>();
  const spendParameters = useSelectPopupSpendParameters();
  const allAssets = useSelectAllAssets();

  const getTicker = (asset: string) => {
    const assetInfo = allAssets.find((a) => a.assetHash === asset);
    return assetInfo ? assetInfo.ticker : asset.slice(0, 4);
  };

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedTxHex?: string) => {
    popupWindowProxy.sendResponse(popupResponseMessage({ accepted, signedTxHex }));
  };

  const handleReject = () => {
    try {
      // Flush tx data
      sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handlePasswordInput = async (password: string, spendParameters: SpendParameters) => {
    try {
      const { pset } = await makeSendPset(
        spendParameters.addressRecipients,
        spendParameters.dataRecipients,
        spendParameters.feeAsset
      );
      const blinder = new BlinderService(walletRepository, await ZKPLib());
      const blindedPset = await blinder.blindPset(pset);
      const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
      const signedPset = await signer.signPset(blindedPset);
      sendResponseMessage(true, signer.finalizeAndExtract(signedPset));
      window.close();
    } catch (e) {
      console.error(e);
      showUnlockModal(false);
      setError(extractErrorMessage(e));
    }
  };

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent max-w-sm pb-20 text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      {!error && spendParameters ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{spendParameters.hostname}</h1>
          <p className="mt-4 text-base font-medium">Requests you to spend</p>
          <div className="h-64 mt-4 overflow-y-auto">
            {spendParameters.addressRecipients.map((recipient, index) => (
              <div key={index}>
                <div className="container flex justify-between mt-6">
                  <span className="text-lg font-medium">{fromSatoshi(recipient.value)}</span>
                  <span className="text-lg font-medium">{getTicker(recipient.asset)}</span>
                </div>
                <div className="container flex items-baseline justify-between">
                  <span className="mr-2 text-lg font-medium">To: </span>
                  <span className="font-small text-sm break-all">
                    {formatAddress(recipient.address)}
                  </span>
                </div>
              </div>
            ))}

            {spendParameters.dataRecipients.map((recipient, index) => (
              <div key={index}>
                <div className="container flex justify-between mt-6">
                  <span className="text-lg font-medium">{fromSatoshi(recipient.value)}</span>
                  <span className="text-lg font-medium">{getTicker(recipient.asset)}</span>
                </div>
                <div className="container flex items-baseline justify-between">
                  <span className="mr-2 text-lg font-medium">To (unspendable): </span>
                  <span className="font-small text-sm break-all">OP_RETURN {recipient.data}</span>
                </div>
              </div>
            ))}
          </div>

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
        <div className="flex flex-col justify-center p-2 align-middle">
          <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
          <span className="max-w-xs mr-2 font-light">{error}</span>
          <img className="mx-auto my-10" src="/assets/images/cross.svg" alt="error" />
          <Button
            className="w-36 container mx-auto mt-10"
            onClick={handleUnlockModalOpen}
            textBase={true}
          >
            Unlock
          </Button>
        </div>
      )}
      {spendParameters && (
        <ModalUnlock
          isModalUnlockOpen={isModalUnlockOpen}
          handleModalUnlockClose={handleModalUnlockClose}
          handleUnlock={async (password: string) =>
            await handlePasswordInput(password, spendParameters)
          }
        />
      )}
    </ShellConnectPopup>
  );
};

export default ConnectSpend;
