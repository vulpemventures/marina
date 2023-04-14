import React, { useEffect, useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import ModalUnlock from '../components/modal-unlock';
import { SOMETHING_WENT_WRONG_ERROR } from '../../domain/constants';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import {
  useSelectPopupHostname,
  useSelectPopupPsetToSign,
} from '../../infrastructure/storage/common';
import { SignerService } from '../../application/signer';
import { popupResponseMessage } from '../../domain/message';
import { Pset } from 'liquidjs-lib';
import { useBackgroundPortContext } from '../context/background-port-context';
import { useStorageContext } from '../context/storage-context';
import { useToastContext } from '../context/toast-context';
import { extractErrorMessage } from '../utility/error';
import { fromSatoshiStr } from '../utility';
import { Spinner } from '../components/spinner';
import type { TxDetailsExtended } from '../../domain/transaction';
import { computeTxDetailsExtended } from '../../domain/transaction';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../application/account';

const PsetView: React.FC<TxDetailsExtended> = ({ txFlow }) => {
  const { cache } = useStorageContext();
  const getPrecision = (asset: string) => {
    if (!cache || !cache.assetsDetails || !cache.assetsDetails.value[asset]) return 8;
    const assetInfo = cache.assetsDetails.value[asset];
    return assetInfo.precision;
  };

  const getTicker = (asset: string) => {
    if (!cache || !cache.assetsDetails || !cache.assetsDetails.value[asset])
      return asset.slice(0, 4);
    const assetInfo = cache.assetsDetails.value[asset];
    return assetInfo.ticker;
  };

  return (
    <div className="flex flex-col">
      <p className="mb-4 text-base font-medium text-center">Requests you to spend</p>
      <div className="container flex flex-col mt-6">
        {Object.entries(txFlow)
          .filter(([, value]) => value < 0)
          .map(([asset, value], index, array) => (
            <div key={index}>
              <div className="container flex justify-between">
                <span className="text-lg font-medium">
                  {fromSatoshiStr(Math.abs(value), getPrecision(asset))}{' '}
                </span>
                <span className="text-lg font-medium">{getTicker(asset)}</span>
              </div>
              {index < array.length - 1 && (
                <div className="w-64 mx-auto border-b-0.5 border-primary pt-1.5 mb-1.5" />
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export interface SignTransactionPopupResponse {
  accepted: boolean;
  signedPset?: string;
}

const ConnectSignTransaction: React.FC = () => {
  const { walletRepository, appRepository } = useStorageContext();
  const { showToast } = useToastContext();
  const { backgroundPort } = useBackgroundPortContext();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txDetails, setTxDetails] = useState<TxDetailsExtended>();

  const psetToSign = useSelectPopupPsetToSign();
  const hostname = useSelectPopupHostname();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  useEffect(() => {
    const init = async () => {
      if (!psetToSign) return;
      const network = await appRepository.getNetwork();
      if (!network) throw new Error('unknown network');
      const pset = Pset.fromBase64(psetToSign);

      const mainAccountsScripts = await walletRepository.getAccountScripts(
        network,
        MainAccountLegacy,
        network === 'liquid' ? MainAccount : MainAccountTest
      );

      const txDetailsExtended = await computeTxDetailsExtended(
        appRepository,
        walletRepository,
        mainAccountsScripts
      )({ height: -1, hex: pset.unsignedTx().toHex() });

      setTxDetails(txDetailsExtended);
    };
    init().catch((e) => {
      console.error(e);
      setError(extractErrorMessage(e));
      showToast(extractErrorMessage(e));
    });
  }, [psetToSign]);

  const sendResponseMessage = (accepted: boolean, signedPset?: string) => {
    return backgroundPort.sendMessage(popupResponseMessage({ accepted, signedPset }));
  };

  const rejectSignRequest = async () => {
    try {
      await sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const signTx = async (password: string) => {
    try {
      if (!psetToSign) throw new Error('no pset to sign');
      if (!password || password.length === 0) throw new Error('Need password');
      const signer = await SignerService.fromPassword(walletRepository, appRepository, password);
      const signedPset = await signer.signPset(Pset.fromBase64(psetToSign));
      await sendResponseMessage(true, signedPset.toBase64());
      window.close();
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }
    handleModalUnlockClose();
  };

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent max-w-sm pb-20 text-center bg-bottom bg-no-repeat"
      currentPage="Sign PSET"
    >
      {!error ? (
        <>
          <h1 className="mt-8 text-2xl font-medium text-center break-all">{hostname}</h1>

          {!txDetails ? (
            <div className="flex flex-col items-center mt-8">
              <Spinner />
              <p className="font-medium">Loading PSET data...</p>
            </div>
          ) : (
            <PsetView {...txDetails} />
          )}

          <ButtonsAtBottom>
            <Button isOutline={true} onClick={rejectSignRequest} textBase={true}>
              Reject
            </Button>
            <Button onClick={handleUnlockModalOpen} textBase={true}>
              Accept
            </Button>
          </ButtonsAtBottom>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
          <p className="font-small mt-4 text-sm">{error}</p>
          <img className="mx-auto my-10" src="/assets/images/cross.svg" alt="error" />
          <Button
            className="w-36 container mx-auto mt-10"
            onClick={handleUnlockModalOpen}
            textBase={true}
            disabled={psetToSign === undefined}
          >
            Unlock
          </Button>
        </>
      )}
      {psetToSign && (
        <ModalUnlock
          isModalUnlockOpen={isModalUnlockOpen}
          handleModalUnlockClose={handleModalUnlockClose}
          handleUnlock={signTx}
        />
      )}
    </ShellConnectPopup>
  );
};

export default ConnectSignTransaction;
