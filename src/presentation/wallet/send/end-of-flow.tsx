import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import {
  blindAndSignPset,
  broadcastTx,
  decrypt,
  restoredMnemonic,
} from '../../../application/utils';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { debounce } from 'lodash';
import { IWallet } from '../../../domain/wallet';
import { Network } from '../../../domain/network';
import { createPassword } from '../../../domain/password';
import { match } from '../../../domain/password-hash';
import { StateRestorerOpts } from 'ldk';
import { extractErrorMessage } from '../../utils/error';
import { MainAccount } from '../../../domain/account';

export interface EndOfFlowProps {
  mainAccount: MainAccount;
  pset?: string;
  explorerURL: string;
  recipientAddress?: string;
}

const EndOfFlow: React.FC<EndOfFlowProps> = ({
  mainAccount,
  pset,
  explorerURL,
  recipientAddress,
}) => {
  const history = useHistory();
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(true);

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleUnlock = async (password: string) => {
    let tx = '';
    if (!pset || !recipientAddress) return;
    try {
      const pass = createPassword(password);
      const mnemo = await mainAccount.getSigningIdentity(pass);
      tx = await blindAndSignPset(mnemo, pset, [recipientAddress]);

      const txid = await broadcastTx(explorerURL, tx);
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txid },
      });
    } catch (error: unknown) {
      return history.push({
        pathname: SEND_PAYMENT_ERROR_ROUTE,
        state: {
          tx: tx,
          error: extractErrorMessage(error),
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
