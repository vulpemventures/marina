import React, { useState } from 'react';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import { SOMETHING_WENT_WRONG_ERROR } from '../../domain/constants';
import { BlinderService } from '../../application/blinder';
import { popupResponseMessage } from '../../domain/message';
import type { SpendParameters } from '../../domain/repository';
import { useSelectPopupSpendParameters } from '../../infrastructure/storage/common';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import ModalUnlock from '../components/modal-unlock';
import ShellConnectPopup from '../components/shell-connect-popup';
import { fromSatoshi, formatAddress } from '../utility';
import { extractErrorMessage } from '../utility/error';
import type { Pset } from 'liquidjs-lib';
import { networks } from 'liquidjs-lib';
import { PsetBuilder } from '../../domain/pset';
import { useStorageContext } from '../context/storage-context';
import { useBackgroundPortContext } from '../context/background-port-context';
import { SignerService } from '../../application/signer';

export interface SpendPopupResponse {
  accepted: boolean;
  signedTxHex?: string;
}

const ConnectSpend: React.FC = () => {
  const { walletRepository, appRepository, taxiRepository, cache } = useStorageContext();
  const { backgroundPort } = useBackgroundPortContext();
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const spendParameters = useSelectPopupSpendParameters();

  const getAssetInfo = (asset: string) => cache?.assetsDetails.value[asset];

  const getTicker = (asset: string) => {
    const assetInfo = getAssetInfo(asset);
    return assetInfo ? assetInfo.ticker : asset.slice(0, 4);
  };

  const getPrecision = (asset: string) => {
    const assetInfo = getAssetInfo(asset);
    return assetInfo ? assetInfo.precision : 8;
  };

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedTxHex?: string) => {
    return backgroundPort.sendMessage(popupResponseMessage({ accepted, signedTxHex }));
  };

  const handleReject = async () => {
    try {
      // Flush tx data
      await sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handlePasswordInput = async (password: string, spendParameters: SpendParameters) => {
    const psetBuilder = new PsetBuilder(walletRepository, appRepository, taxiRepository);
    try {
      const network = await appRepository.getNetwork();
      if (!network) throw new Error('Network not found');
      let pset: Pset;

      if (spendParameters.feeAsset === networks[network].assetHash) {
        const result = await psetBuilder.createRegularPset(
          spendParameters.addressRecipients,
          spendParameters.dataRecipients
        );
        pset = result.pset;
      } else {
        const result = await psetBuilder.createTaxiPset(
          spendParameters.feeAsset,
          spendParameters.addressRecipients,
          spendParameters.dataRecipients
        );
        pset = result.pset;
      }
      const blinder = new BlinderService(walletRepository, await ZKPLib());
      const blindedPset = await blinder.blindPset(pset);
      const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
      const signedPset = await signer.signPset(blindedPset);
      await sendResponseMessage(true, signer.finalizeAndExtract(signedPset));
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
                  <span data-testid={recipient.asset} className="text-lg font-medium">
                    {fromSatoshi(recipient.value, getPrecision(recipient.asset))}
                  </span>
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
