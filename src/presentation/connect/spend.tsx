import React, { useRef, useState } from 'react';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import { formatAddress, fromSatoshi } from '../utils';
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
  ChangeAddressFromAssetGetter,
  IdentityInterface,
  NetworkString,
  RecipientInterface,
  UnblindedOutput,
} from 'ldk';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { flushTx } from '../../application/redux/actions/connect';
import { ConnectData } from '../../domain/connect';
import { blindAndSignPset, createSendPset } from '../../application/utils/transaction';
import { incrementChangeAddressIndex } from '../../application/redux/actions/wallet';
import { selectMainAccount, selectUtxos } from '../../application/redux/selectors/wallet.selector';
import PopupWindowProxy from './popupWindowProxy';
import { Account, MainAccountID } from '../../domain/account';
import { SOMETHING_WENT_WRONG_ERROR } from '../../application/utils/constants';
import { selectNetwork } from '../../application/redux/selectors/app.selector';
import { lbtcAssetByNetwork } from '../../application/utils/network';

export interface SpendPopupResponse {
  accepted: boolean;
  signedTxHex?: string;
}

const ConnectSpend: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const assets = useSelector((state: RootReducerState) => state.assets);
  const mainAccount = useSelector(selectMainAccount);

  const network = useSelector(selectNetwork);
  const coins = useSelector(selectUtxos(MainAccountID));

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
    if (!connectData.tx?.recipients) return;

    try {
      const assets = assetsSet(
        connectData.tx?.recipients,
        connectData.tx.feeAssetHash ?? lbtcAssetByNetwork(network)
      );

      const { getter, changeAddresses } = await changeAddressGetter(
        mainAccount,
        assets,
        dispatch,
        network
      );

      const accounts: Account[] = [mainAccount];
      const identities = await Promise.all(
        accounts.map((a) => a.getSigningIdentity(password, network))
      );
      const signedTxHex = await makeTransaction(
        identities,
        coins,
        connectData.tx,
        network,
        getter,
        changeAddresses
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

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent max-w-sm pb-20 text-center bg-bottom bg-no-repeat"
      currentPage="Spend"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{connectData.tx?.hostname}</h1>

          <p className="mt-4 text-base font-medium">Requests you to spend</p>

          <div className="h-64 mt-4 overflow-y-auto">
            {connectData.tx?.recipients?.map((recipient: RecipientInterface, index) => (
              <div key={index}>
                <div className="container flex justify-between mt-6">
                  <span className="text-lg font-medium">{fromSatoshi(recipient.value)}</span>
                  <span className="text-lg font-medium">{getTicker(recipient.asset)}</span>
                </div>
                <div className="container flex items-baseline justify-between">
                  <span className="mr-2 text-lg font-medium">To: </span>
                  <span className="font-small text-sm break-all">
                    {formatAddress(recipient.address)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bottom-12 container absolute right-0 flex justify-between">
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

function assetsSet(recipients: RecipientInterface[], feeAsset: string): Set<string> {
  return new Set(recipients.map((r) => r.asset).concat([feeAsset]));
}

async function changeAddressGetter(
  account: Account,
  assets: Set<string>,
  dispatch: ProxyStoreDispatch,
  net: NetworkString
): Promise<{ getter: ChangeAddressFromAssetGetter; changeAddresses: string[] }> {
  const changeAddresses: Record<string, AddressInterface> = {};
  const persisted: Record<string, boolean> = {};

  const id = await account.getWatchIdentity(net);
  for (const asset of assets) {
    changeAddresses[asset] = await id.getNextChangeAddress();
    persisted[asset] = false;
  }

  return {
    getter: (asset: string) => {
      if (!assets.has(asset)) throw new Error('missing change address');
      if (!persisted[asset]) {
        dispatch(incrementChangeAddressIndex(account.getAccountID(), net)).catch(console.error);
        persisted[asset] = true;
      }
      return changeAddresses[asset].confidentialAddress;
    },
    changeAddresses: Object.values(changeAddresses).map((a) => a.confidentialAddress),
  };
}

async function makeTransaction(
  identities: IdentityInterface[],
  coins: UnblindedOutput[],
  connectDataTx: ConnectData['tx'],
  network: NetworkString,
  changeAddressGetter: ChangeAddressFromAssetGetter,
  changeAddresses: string[]
) {
  if (!connectDataTx || !connectDataTx.recipients || !connectDataTx.feeAssetHash)
    throw new Error('transaction data are missing');

  const { recipients, feeAssetHash, data } = connectDataTx;

  const unsignedPset = await createSendPset(
    recipients,
    coins,
    feeAssetHash,
    changeAddressGetter,
    network,
    data
  );

  const txHex = await blindAndSignPset(
    unsignedPset,
    coins,
    identities,
    recipients.map(({ address }) => address),
    changeAddresses
  );

  return txHex;
}
