import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import {
  blindAndSignPset,
  broadcastTx,
  decrypt,
  explorerApiUrl,
  outPubKeysMap,
} from '../../../application/utils';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { debounce } from 'lodash';
import { IWallet } from '../../../domain/wallet';
import { Network } from '../../../domain/network';
import { createPassword } from '../../../domain/password';
import { match } from '../../../domain/password-hash';

export interface EndOfFlowProps {
  wallet: IWallet;
  network: Network;
  pset?: string;
  outputAddresses: string[];
}

const EndOfFlow: React.FC<EndOfFlowProps> = ({ wallet, network, pset, outputAddresses }) => {
  const history = useHistory();
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(true);

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleUnlock = async (password: string) => {
    let tx = '';
    if (!pset) return;
    try {
      const pass = createPassword(password);
      if (!match(password, wallet.passwordHash)) {
        throw new Error('Invalid password');
      }

      const mnemonic = decrypt(wallet.encryptedMnemonic, pass, network);
      const outputPubKeys = outPubKeysMap(pset, outputAddresses);
      const outputsToBlind = Array.from(outputPubKeys.keys());

      tx = await blindAndSignPset(
        mnemonic,
        wallet.confidentialAddresses,
        network,
        pset,
        outputsToBlind,
        outputPubKeys
      );

      const txid = await broadcastTx(explorerApiUrl[network], tx);
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txid },
      });
    } catch (error) {
      return history.push({
        pathname: SEND_PAYMENT_ERROR_ROUTE,
        state: {
          tx: tx,
          error: error.message,
        },
      });
    }

    handleModalUnlockClose();
  };

  const debouncedHandleUnlock = useRef(
    debounce(handleUnlock, 2000, { leading: true, trailing: false })
  ).current;

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Unlock"
      hasBackBtn={!isModalUnlockOpen || false}
    >
      {!isModalUnlockOpen && (
        <div className="text-center">
          <h1 className="mx-1 mt-16 text-lg font-medium text-left">
            You must unlock your wallet to proceed with the transaction
          </h1>
          <Button className="mt-28" onClick={handleUnlockModalOpen}>
            Unlock
          </Button>
        </div>
      )}
      <ModalUnlock
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={debouncedHandleUnlock}
        isModalUnlockOpen={isModalUnlockOpen}
      />
    </ShellPopUp>
  );
};

export default EndOfFlow;
