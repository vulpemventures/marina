import React, { useState } from 'react';
import ZKPLib from '@vulpemventures/secp256k1-zkp';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { extractErrorMessage } from '../../utility/error';
import { INVALID_PASSWORD_ERROR, SOMETHING_WENT_WRONG_ERROR } from '../../../constants';
import { SignerService } from '../../../domain/signer';
import {
  appRepository,
  sendFlowRepository,
  walletRepository,
} from '../../../infrastructure/storage/common';
import { BlinderService } from '../../../domain/blinder';
import { Pset } from 'liquidjs-lib';

const SendEndOfFlow: React.FC = () => {
  const history = useHistory();
  const [invalidPasswordError, setInvalidPasswordError] = useState(false);
  const [unlockModal, setUnlockModal] = useState(true);

  const handleModalUnlockClose = () => setUnlockModal(false);
  const handleUnlockModalOpen = () => {
    setInvalidPasswordError(false);
    setUnlockModal(true);
  };

  const handleUnlock = async (password: string) => {
    let toBroadcast = undefined;
    try {
      const unsignedPset = await sendFlowRepository.getUnsignedPset();
      if (!unsignedPset) throw new Error('unsigned pset not found');
      const network = await appRepository.getNetwork();
      if (!network) throw new Error('network not found');
      const chainSource = await appRepository.getChainSource(network);
      if (!chainSource) throw new Error('chain source not found');
      const blinder = new BlinderService(walletRepository, await ZKPLib());
      const blindedPset = await blinder.blindPset(Pset.fromBase64(unsignedPset));
      const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
      const signed = await signer.signPset(blindedPset);
      toBroadcast = signer.finalizeAndExtract(signed);
      const txid = await chainSource.broadcastTransaction(toBroadcast);
      if (!txid) throw new Error('something went wrong with the tx broadcasting');
      await sendFlowRepository.reset();

      // update tx in repository
      await walletRepository.addTransactions(network, txid);
      await walletRepository.updateTxDetails({
        [txid]: {
          height: 0, // unconfirmed, subscriber will update this once the tx is propagated
          hex: toBroadcast,
        },
      });
      await chainSource.close();

      // push to success page
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txhex: toBroadcast },
      });
    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error);
      if (errorMessage === INVALID_PASSWORD_ERROR) {
        // does not use payment error view in case of invalid password
        setInvalidPasswordError(true);
      } else {
        return history.push({
          pathname: SEND_PAYMENT_ERROR_ROUTE,
          state: {
            error: errorMessage,
            tx: toBroadcast,
          },
        });
      }
    }

    handleModalUnlockClose();
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Unlock"
      hasBackBtn={!unlockModal || false}
    >
      {!unlockModal && !invalidPasswordError && (
        <div className="text-center">
          <h1 className="mx-1 mt-16 text-lg font-medium text-left">
            You must unlock your wallet to proceed with the transaction
          </h1>
          <Button className="mt-28" onClick={handleUnlockModalOpen}>
            Unlock
          </Button>
        </div>
      )}
      {!unlockModal && invalidPasswordError && (
        <div className="text-center">
          <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
          <p className="font-small mt-4 text-sm">{INVALID_PASSWORD_ERROR}</p>
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
      <ModalUnlock
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={handleUnlock}
        isModalUnlockOpen={unlockModal}
      />
    </ShellPopUp>
  );
};

export default SendEndOfFlow;
