import React, { useRef, useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import { formatAddress } from '../utils';
import ModalUnlock from '../components/modal-unlock';
import { debounce } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import {
  connectWithConnectData,
  WithConnectDataProps,
} from '../../application/redux/containers/with-connect-data.container';
import { RootReducerState } from '../../domain/common';
import type {
  AddressInterface,
  Mnemonic,
  NetworkString,
  RecipientInterface,
  UnblindedOutput,
} from 'ldk';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { flushTx } from '../../application/redux/actions/connect';
import { ConnectData } from '../../domain/connect';
import { mnemonicWallet } from '../../application/utils/restorer';
import { blindAndSignPset, createSendPset } from '../../application/utils/transaction';
import { incrementChangeAddressIndex } from '../../application/redux/actions/wallet';
import {
  restorerOptsSelector,
  utxosSelector,
} from '../../application/redux/selectors/wallet.selector';
import { decrypt } from '../../application/utils/crypto';
import PopupWindowProxy from './popupWindowProxy';
import { SOMETHING_WENT_WRONG_ERROR } from '../../application/utils/constants';

export interface SpendPopupResponse {
  accepted: boolean;
  signedTxHex?: string;
}

const ConnectSpend: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const assets = useSelector((state: RootReducerState) => state.assets);
  const coins = useSelector(utxosSelector);
  const restorerOpts = useSelector(restorerOptsSelector);
  const encryptedMnemonic = useSelector(
    (state: RootReducerState) => state.wallet.encryptedMnemonic
  );
  const network = useSelector((state: RootReducerState) => state.app.network);

  const dispatch = useDispatch<ProxyStoreDispatch>();

  const getTicker = (assetHash: string) => assets[assetHash]?.ticker ?? 'Unknown';

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const popupWindowProxy = new PopupWindowProxy<SpendPopupResponse>();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean, signedTxHex?: string) => {
    return popupWindowProxy.sendResponse({ data: { accepted, signedTxHex } });
  };

  const handleReject = async () => {
    try {
      // Flush tx data
      await dispatch(flushTx());
      await sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const handleUnlock = async (password: string) => {
    if (!password || password.length === 0) return;

    try {
      const mnemonicIdentity = await mnemonicWallet(
        decrypt(encryptedMnemonic, password),
        restorerOpts,
        network
      );
      const signedTxHex = await makeTransaction(
        mnemonicIdentity,
        coins,
        connectData.tx,
        network,
        dispatch
      );
      await sendResponseMessage(true, signedTxHex);

      await dispatch(flushTx());
      window.close();
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    }

    handleModalUnlockClose();
  };

  const debouncedHandleUnlock = useRef(
    debounce(handleUnlock, 2000, { leading: true, trailing: false })
  ).current;

  return (
    <ShellConnectPopup
      className="h-popupContent max-w-sm pb-20 text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{connectData.tx?.hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to spend</p>

          {connectData.tx?.recipients?.map((recipient: RecipientInterface, index) => (
            <div key={index}>
              <div className="container flex justify-between mt-16">
                <span className="text-lg font-medium">{recipient.value}</span>
                <span className="text-lg font-medium">{getTicker(recipient.asset)}</span>
              </div>

              <div className="container flex items-baseline justify-between mt-4">
                <span className="mr-2 text-lg font-medium">To: </span>
                <span className="font-small text-sm break-all">
                  {formatAddress(recipient.address)}
                </span>
              </div>
            </div>
          ))}

          <div className="bottom-24 container absolute right-0 flex justify-between">
            <Button isOutline={true} onClick={handleReject} textBase={true}>
              Reject
            </Button>
            <Button onClick={handleUnlockModalOpen} textBase={true}>
              Accept
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col justify-center p-2 align-middle">
          <h1 className="mt-8 text-lg font-medium">{SOMETHING_WENT_WRONG_ERROR}</h1>
          <span className="max-w-xs mr-2 font-light">{error}</span>
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
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={debouncedHandleUnlock}
      />
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(ConnectSpend);

async function makeTransaction(
  mnemonic: Mnemonic,
  coins: UnblindedOutput[],
  connectDataTx: ConnectData['tx'],
  network: NetworkString,
  dispatch: ProxyStoreDispatch
) {
  if (!connectDataTx || !connectDataTx.recipients || !connectDataTx.feeAssetHash)
    throw new Error('transaction data are missing');

  const { recipients, feeAssetHash, data } = connectDataTx;

  const assets = Array.from(new Set(recipients.map(({ asset }) => asset).concat(feeAssetHash)));

  const changeAddresses: Record<string, AddressInterface> = {};
  const persisted: Record<string, boolean> = {};

  for (const asset of assets) {
    changeAddresses[asset] = await mnemonic.getNextChangeAddress();
    persisted[asset] = false;
  }

  const changeAddressGetter = (asset: string) => {
    if (!assets.includes(asset)) return ''; // will throw an error in coin selector
    if (!persisted[asset]) {
      dispatch(incrementChangeAddressIndex()).catch(console.error);
      persisted[asset] = true;
    }
    return changeAddresses[asset].confidentialAddress;
  };

  const unsignedPset = await createSendPset(
    recipients,
    coins,
    feeAssetHash,
    changeAddressGetter,
    network,
    data
  );

  const txHex = await blindAndSignPset(
    mnemonic,
    unsignedPset,
    recipients
      .map(({ address }) => address)
      .concat(Object.values(changeAddresses).map(({ confidentialAddress }) => confidentialAddress))
  );

  return txHex;
}
