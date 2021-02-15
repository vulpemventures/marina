import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { browser } from 'webextension-polyfill-ts';
import { deriveNewAddress, unsetPendingTx } from '../../../application/store/actions';
import { flush } from '../../../application/store/actions/transaction';
import { AppContext } from '../../../application/store/context';
import { decrypt, hash } from '../../../application/utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import { DEFAULT_ROUTE } from '../../routes/constants';
import {
  blindAndSignPset,
  blindingInfoFromPendingTx,
  broadcastTx,
  explorerURL,
  formatTxid,
} from '../../utils';

interface State {
  mnemonic: string;
  txid: string;
  isLoading: boolean;
  success: boolean;
  aborted: boolean;
  error?: Error;
}

const EndOfFlow: React.FC = () => {
  const history = useHistory();
  const [{ wallets, app }, dispatch] = useContext(AppContext);
  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [state, setState] = useState<State>({
    mnemonic: '',
    isLoading: true,
    success: false,
    aborted: false,
    error: undefined,
    txid: '',
  });
  const wallet = wallets[0];

  useEffect(() => {
    console.log('BUSY?', busy)
    console.log('ISMODALOPEN?', isModalUnlockOpen)
    console.log('ERRORS', state.error)
    if (!state.aborted && !busy && !isModalUnlockOpen) {
      setBusy(true);
      void (async (): Promise<void> => {
        try {
          const { sendAsset, feeAsset, value } = wallet.pendingTx!.props;

          const { outputsToBlind, outPubkeys } = blindingInfoFromPendingTx(
            wallet.pendingTx!.props,
            app.network.value
          );

          const tx: string = await blindAndSignPset(
            state.mnemonic,
            wallet.masterBlindingKey.value,
            wallet.confidentialAddresses,
            app.network.value,
            value,
            outputsToBlind,
            outPubkeys
          );

          const txid = await broadcastTx(explorerURL[app.network.value], tx);

          const onError = (err: Error) => {
            console.log(err);
          };
          const onSuccess = () => {
            dispatch(
              unsetPendingTx(() => {
                setState({ ...state, mnemonic: '', success: true, isLoading: false, txid });
                browser.browserAction.setBadgeText({ text: '' }).catch((ignore) => ({}));
              }, onError)
            );
          };

          // persist change addresses before unsetting the pending tx
          dispatch(
            deriveNewAddress(
              true,
              () => {
                if (feeAsset !== sendAsset) {
                  dispatch(deriveNewAddress(true, onSuccess, onError));
                } else {
                  onSuccess();
                }
              },
              onError
            )
          );
        } catch (error) {
          setState({ ...state, isLoading: false, error });
        }
      })();
    }
  }, [app, wallets, dispatch, state, isModalUnlockOpen, busy]);

  const handleShowMnemonic = (password: string) => {
    if (!wallet.passwordHash.equals(hash(Password.create(password)))) {
      throw new Error('Invalid password');
    }
    const mnemonic = decrypt(wallet.encryptedMnemonic, Password.create(password)).value;
    setState({ ...state, mnemonic });
    showUnlockModal(false);
  };
  const handleModalUnlockClose = () => {
    showUnlockModal(false);
    setState({ ...state, isLoading: false, aborted: true });
  }

  const handleUnlock = () => {
    showUnlockModal(true);
    setBusy(false);
    setState({ ...state, isLoading: true, aborted: false });
  }
  const handleBackToHome = () => {
    dispatch(flush());
    history.push(DEFAULT_ROUTE);
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
      hasBackBtn={false}
    >
      {state.isLoading && <span className="font-medium">Loading...</span>}
      {!state.isLoading && !isModalUnlockOpen && state.aborted && (
        <div className="container mx-auto text-center">
          <h1>Unlock my wallet to send transaction</h1>
          <Button onClick={handleUnlock}>Unlock</Button>
        </div>
      )}
      {!state.isLoading && !isModalUnlockOpen && !state.aborted && (
        <div className="container mx-auto text-center">
          <span className="font-medium">{state.success ? 'Success' : 'Failed'}</span>
          {state.txid.length > 0 && <h1>Transaction id: {formatTxid(state.txid)}</h1>}
          {state.error && <h1>{state.error.message}</h1>}
          <Button onClick={handleBackToHome}>Back to home</Button>
        </div>
      )}
      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleShowMnemonic={handleShowMnemonic}
      />
    </ShellPopUp>
  );
};

export default EndOfFlow;
