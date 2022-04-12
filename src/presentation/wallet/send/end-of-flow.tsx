import React, { useState } from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { createPassword } from '../../../domain/password';
import { extractErrorMessage } from '../../utils/error';
import type { Account } from '../../../domain/account';
import { Transaction } from 'ldk';
import type { NetworkString, UnblindedOutput } from 'ldk';
import { updateTaskAction } from '../../../application/redux/actions/updater';
import { useDispatch } from 'react-redux';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { broadcastTx } from '../../../application/utils/network';
import { blindAndSignPset } from '../../../application/utils/transaction';

export interface EndOfFlowProps {
  accounts: Account[];
  pset?: string;
  selectedUtxos: UnblindedOutput[];
  explorerURL: string;
  recipientAddress?: string;
  changeAddresses: string[];
  network: NetworkString;
}

const EndOfFlow: React.FC<EndOfFlowProps> = ({
  accounts,
  pset,
  explorerURL,
  recipientAddress,
  selectedUtxos,
  changeAddresses,
  network,
}) => {
  const history = useHistory();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(true);
  const [signedTx, setSignedTx] = useState<string>();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const handleUnlock = async (password: string) => {
    try {
      setSignedTx(undefined);
      if (!pset || !recipientAddress) throw new Error('no pset to sign');
      const pass = createPassword(password);
      const identities = await Promise.all(
        accounts.map((a) => a.getSigningIdentity(pass, network))
      );
      const tx = await blindAndSignPset(
        pset,
        selectedUtxos,
        identities,
        [recipientAddress],
        changeAddresses
      );
      setSignedTx(tx);

      const txid = Transaction.fromHex(tx).getId();
      await broadcastTx(explorerURL, tx);

      // start updater
      await Promise.all(
        accounts
          .map((a) => a.getAccountID())
          .map((id) => updateTaskAction(id, network))
          .map(dispatch)
      );
      // flush pending tx state
      await dispatch(flushPendingTx());

      // push to success page
      history.push({
        pathname: SEND_PAYMENT_SUCCESS_ROUTE,
        state: { txid },
      });
    } catch (error: unknown) {
      return history.push({
        pathname: SEND_PAYMENT_ERROR_ROUTE,
        state: {
          tx: signedTx,
          error: extractErrorMessage(error),
        },
      });
    }

    handleModalUnlockClose();
  };

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
        handleUnlock={handleUnlock}
        isModalUnlockOpen={isModalUnlockOpen}
      />
    </ShellPopUp>
  );
};

export default EndOfFlow;
