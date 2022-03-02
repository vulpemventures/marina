import React, { useRef, useState } from 'react';
import { useHistory } from 'react-router';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';
import { debounce } from 'lodash';
import { createPassword } from '../../../domain/password';
import { extractErrorMessage } from '../../utils/error';
import { Account } from '../../../domain/account';
import { NetworkString, UnblindedOutput } from 'ldk';
import { updateTaskAction } from '../../../application/redux/actions/updater';
import { useDispatch } from 'react-redux';
import { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { flushPendingTx } from '../../../application/redux/actions/transaction';
import { broadcastTx } from '../../../application/utils/network';
import { blindAndSignPset } from '../../../application/utils/transaction';
import { lockUtxo } from '../../../application/redux/actions/utxos';

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

      const txid = await broadcastTx(explorerURL, tx);
      if (!txid) throw new Error('something went wrong with the tx broadcasting');

      // lock utxos used in successful broadcast
      for (const utxo of selectedUtxos) {
        await dispatch(lockUtxo(utxo));
      }

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
          selectedUtxos,
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
