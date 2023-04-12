import React, { useEffect, useState } from 'react';
import zkpLib from '@vulpemventures/secp256k1-zkp';
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
import { AssetHash, ElementsValue, Pset } from 'liquidjs-lib';
import { useBackgroundPortContext } from '../context/background-port-context';
import { useStorageContext } from '../context/storage-context';
import type { ScriptDetails, UnblindedOutput } from 'marina-provider';
import { useToastContext } from '../context/toast-context';
import { extractErrorMessage } from '../utility/error';
import type { AppRepository, AssetRepository, WalletRepository } from '../../domain/repository';
import { WalletRepositoryUnblinder } from '../../application/unblinder';
import { fromSatoshi } from '../utility';
import { Spinner } from '../components/spinner';

interface PsetInfos {
  txID: string;
  utxosInInputs: UnblindedOutput[];
  walletOutputs: ({ asset: string; value: number } & ScriptDetails)[];
  feeOutputAmount: number;
}

async function getPsetInformations(
  psetb64: string,
  appRepository: AppRepository,
  walletRepository: WalletRepository,
  assetRepository: AssetRepository
): Promise<PsetInfos> {
  const pset = Pset.fromBase64(psetb64);
  const network = await appRepository.getNetwork();
  if (!network) throw new Error('unknown network');
  const unsignedTx = pset.unsignedTx();

  const result: PsetInfos = {
    txID: unsignedTx.getId(),
    utxosInInputs: [],
    walletOutputs: [],
    feeOutputAmount: 0,
  };

  const inputsBlindingData = await walletRepository.getOutputBlindingData(
    ...pset.inputs.map((input) => ({
      txid: Buffer.from(input.previousTxid).reverse().toString('hex'),
      vout: input.previousTxIndex,
    }))
  );

  result.utxosInInputs = inputsBlindingData;

  const allWalletScripts = await walletRepository.getAccountScripts(network);
  const unblinder = new WalletRepositoryUnblinder(
    walletRepository,
    appRepository,
    assetRepository,
    await zkpLib()
  );

  for (const output of unsignedTx.outs) {
    if (!output.script || output.script.length === 0) {
      result.feeOutputAmount = ElementsValue.fromBytes(output.value).number; // fee output is always unconfidential
      continue;
    }

    const script = Buffer.from(output.script).toString('hex');
    const scriptDetails = allWalletScripts[script];
    if (scriptDetails) {
      const value = ElementsValue.fromBytes(output.value);
      if (value.isConfidential) {
        const [unblinded] = await unblinder.unblind(output);
        if (unblinded instanceof Error) continue;
        result.walletOutputs.push({
          ...scriptDetails,
          asset: unblinded.asset,
          value: unblinded.value,
        });
      } else {
        result.walletOutputs.push({
          ...scriptDetails,
          asset: AssetHash.fromBytes(output.asset).hex,
          value: value.number,
        });
      }
    }
  }

  return result;
}

const PsetView: React.FC<PsetInfos> = ({ txID, utxosInInputs, walletOutputs, feeOutputAmount }) => {
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
      <p className="mt-4 text-base font-medium text-center">Requests you to send</p>
      <div className="container flex flex-col">
        {walletOutputs.map(({ asset, value, accountName }, index) => (
          <div key={index}>
            <div className="container flex justify-between mt-6">
              <span className="text-lg font-medium">
                {fromSatoshi(value, getPrecision(asset))}{' '}
              </span>
              <span className="text-lg font-medium">{getTicker(asset)}</span>
            </div>
            <div className="container flex items-baseline justify-between">
              <span className="mr-2 text-lg font-medium">To: </span>
              <span className="font-small text-sm break-all">{accountName}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-base font-medium">
        Requests you to sign {utxosInInputs.filter(({ blindingData }) => !!blindingData).length}{' '}
        utxo(s)
      </p>
      <p className="mt-2 text-base font-medium">
        Fee output: {fromSatoshi(feeOutputAmount, 8)} L-BTC
      </p>
    </div>
  );
};

export interface SignTransactionPopupResponse {
  accepted: boolean;
  signedPset?: string;
}

const ConnectSignTransaction: React.FC = () => {
  const { walletRepository, appRepository, assetRepository } = useStorageContext();
  const { showToast } = useToastContext();
  const { backgroundPort } = useBackgroundPortContext();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [psetInfos, setPsetInfos] = useState<PsetInfos>();

  const psetToSign = useSelectPopupPsetToSign();
  const hostname = useSelectPopupHostname();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  useEffect(() => {
    const init = async () => {
      if (!psetToSign) return;
      setPsetInfos(
        await getPsetInformations(psetToSign, appRepository, walletRepository, assetRepository)
      );
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

          {!psetInfos ? (
            <div className="flex flex-col items-center mt-8">
              <Spinner />
              <p className="font-medium">Loading PSET data...</p>
            </div>
          ) : (
            <PsetView {...psetInfos} />
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
