import React, { useContext, useState } from 'react';
import { useHistory } from 'react-router';
import { AppContext } from '../../../application/store/context';
import { Password } from '../../../domain/wallet/value-objects';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import {
  blindAndSignPset,
  blindingInfoFromPendingTx,
  broadcastTx,
  decrypt,
  explorerApiUrl,
  hash,
} from '../../../application/utils';
import { SEND_PAYMENT_ERROR_ROUTE, SEND_PAYMENT_SUCCESS_ROUTE } from '../../routes/constants';

const EndOfFlow: React.FC = () => {
  const history = useHistory();
  const [{ wallets, app }] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(true);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const wallet = wallets[0];

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleShowUnlockModal = () => showUnlockModal(true);

  const handleUnlock = async (password: string) => {
    if (!isBusy) {
      setIsBusy(true);
      let tx = '';
      try {
        if (!wallet.passwordHash.equals(hash(Password.create(password)))) {
          throw new Error('Invalid password');
        }
        const mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;
        const { props } = wallet.pendingTx!;
        const { outputsToBlind, outPubkeys } = blindingInfoFromPendingTx(props, app.network.value);
        tx = await blindAndSignPset(
          mnemonic,
          wallet.masterBlindingKey.value,
          wallet.confidentialAddresses,
          app.network.value,
          props.value,
          outputsToBlind,
          outPubkeys
        );
        const txid = await broadcastTx(explorerApiUrl[app.network.value], tx);
        history.push({
          pathname: SEND_PAYMENT_SUCCESS_ROUTE,
          state: { changeAddress: wallet.pendingTx?.changeAddress, txid: txid },
        });
      } catch (error) {
        console.error(error);
        history.push({
          pathname: SEND_PAYMENT_ERROR_ROUTE,
          state: { changeAddress: wallet.pendingTx?.changeAddress, tx: tx },
        });
      }
    }
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
          <Button className="mt-28" onClick={handleShowUnlockModal}>
            Unlock
          </Button>
        </div>
      )}
      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={handleUnlock}
      />
    </ShellPopUp>
  );
};

export default EndOfFlow;
