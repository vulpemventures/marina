import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { browser } from 'webextension-polyfill-ts';
import { deriveNewAddress, flush, unsetPendingTx } from '../../../application/store/actions';
import { AppContext } from '../../../application/store/context';
import { decrypt, hash } from '../../../application/utils/crypto';
import { Password } from '../../../domain/wallet/value-objects';
import Button from '../../components/button';
import ModalUnlock from '../../components/modal-unlock';
import ShellPopUp from '../../components/shell-popup';
import { DEFAULT_ROUTE } from '../../routes/constants';
import useLottieLoader from '../../hooks/use-lottie-loader';
import {
  blindAndSignPset,
  blindingInfoFromPendingTx,
  broadcastTx,
  explorerURL,
  esploraURL,
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

  // Populate ref div with svg animation
  const marinaLoaderRef = React.useRef(null);
  useLottieLoader(marinaLoaderRef);

  useEffect(() => {
    if (!state.aborted && !busy && !isModalUnlockOpen) {
      setBusy(true);
      void (async (): Promise<void> => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const { props } = wallet.pendingTx!;
          const { sendAsset, feeAsset, value } = props;

          const { outputsToBlind, outPubkeys } = blindingInfoFromPendingTx(
            props,
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
  }, [app, wallet, dispatch, state, isModalUnlockOpen, busy]);

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
  };

  const handleUnlock = () => {
    showUnlockModal(true);
    setBusy(false);
    setState({ ...state, isLoading: true, aborted: false });
  };
  const handleBackToHome = () => {
    dispatch(flush());
    history.push(DEFAULT_ROUTE);
  };

  if (state.isLoading) {
    return (
      <>
        <div
          className="flex items-center justify-center h-screen p-8"
          id="marina-loader"
          ref={marinaLoaderRef}
        />

        <ModalUnlock
          isModalUnlockOpen={isModalUnlockOpen}
          handleModalUnlockClose={handleModalUnlockClose}
          handleShowMnemonic={handleShowMnemonic}
        />
      </>
    );
  }

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Send"
      hasBackBtn={false}
    >
      {!state.isLoading && !isModalUnlockOpen && state.aborted && (
        <div className="container mx-auto text-center">
          <h1>Unlock my wallet to send transaction</h1>
          <Button onClick={handleUnlock}>Unlock</Button>
        </div>
      )}

      {!state.isLoading && !isModalUnlockOpen && !state.aborted && (
        <div className="container mx-auto">
          <h1 className="font-regular text-base my-8 text-center">{state.success ? 'Success' : 'Failed'}</h1>
          <br />
          {
            state.txid.length > 0 &&
            <a href={`${esploraURL[app.network.value]}/tx/${state.txid}`} target="_blank" rel="noreferrer" className="mt-6 mb-6">
              <p className="font-regular text-small my-8 text-center">Click to see transaction on Blockstream.info</p>
            </a>
          }
          {state.error && <h1>{state.error.message}</h1>}
          <br />
          <Button onClick={handleBackToHome}>Back to home</Button>
        </div>
      )}
    </ShellPopUp>
  );
};

export default EndOfFlow;
