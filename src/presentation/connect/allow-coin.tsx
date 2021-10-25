import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  connectWithConnectData,
  WithConnectDataProps,
} from '../../application/redux/containers/with-connect-data.container';
import { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { RootReducerState } from '../../domain/common';
import Button from '../components/button';
import ShellConnectPopup from '../components/shell-connect-popup';
import PopupWindowProxy from './popupWindowProxy';
import { debounce } from 'lodash';
import { MultisigWithCosigner } from '../../domain/cosigner';
import { UtxoInterface } from 'ldk';
import { Network } from '../../domain/network';
import { Psbt, Transaction } from 'liquidjs-lib';
import { networkFromString } from '../../application/utils';
import {
  selectRestrictedAssetAccount,
  selectUtxos,
} from '../../application/redux/selectors/wallet.selector';
import { RestrictedAssetAccountID } from '../../domain/account';
import ModalUnlock from '../components/modal-unlock';
import { extractErrorMessage } from '../utils/error';
import { allowCoin } from '../../application/redux/actions/allowance';
import browser from 'webextension-polyfill';

async function createAndSendAllowCoinPset(
  identity: MultisigWithCosigner,
  utxo: UtxoInterface,
  network: Network
) {
  const pset = new Psbt({ network: networkFromString(network) });

  pset.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: utxo.prevout,
    sighashType: Transaction.SIGHASH_NONE + Transaction.SIGHASH_ANYONECANPAY,
  });

  return identity.allow(pset.toBase64());
}

const AllowCoinView: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const network = useSelector((state: RootReducerState) => state.app.network);
  const electrs = useSelector(
    (state: RootReducerState) => state.app.explorerByNetwork[state.app.network].electrsURL
  );
  const restrictedAssetAccount = useSelector(selectRestrictedAssetAccount);
  const utxos = useSelector(selectUtxos(RestrictedAssetAccountID));

  const [unlock, setUnlock] = useState(false);
  const [error, setError] = useState<string>();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const popupWindowProxy = new PopupWindowProxy<boolean>();

  const handleReject = async () => {
    await popupWindowProxy.sendResponse({ data: false });
    window.close();
  };

  const openPasswordModal = () => {
    setError(undefined);
    setUnlock(true);
  };

  const handleAllow = async (password: string) => {
    if (!connectData.allowance?.allowCoin) throw new Error('no coin has been selected');
    if (!restrictedAssetAccount)
      throw new Error('multisig account is undefined, u maybe need to pair with a cosigner');
    try {
      const { txid, vout } = connectData.allowance.allowCoin;
      const utxo = utxos.find((u) => u.txid === txid && u.vout === vout);
      if (!utxo)
        throw new Error('the requested coin is not owned by your restricted asset account');

      const id = await restrictedAssetAccount.getSigningIdentity(password);
      await createAndSendAllowCoinPset(id, utxo, network);
      await dispatch(allowCoin(utxo.txid, utxo.vout));
      await popupWindowProxy.sendResponse({ data: true });
      window.close();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUnlock(false);
    }
  };

  const debouncedHandleAllow = useRef(
    debounce(handleAllow, 2000, { leading: true, trailing: false })
  ).current;

  const handleOpenExplorer = () => {
    browser.tabs
      .create({
        url: `${electrs}/tx/${connectData.allowance?.allowCoin.txid}`,
        active: false,
      })
      .catch((err) => setError(extractErrorMessage(err)));
  };

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">Allow</h1>

      <p className="mt-12 text-base font-medium">Allow website to spend a coin</p>
      <Button className="w-44 container mx-auto mt-10" onClick={handleOpenExplorer} textBase={true}>
        See in Explorer
      </Button>

      {error && <p className="text-red">{error}</p>}

      <div className="bottom-24 container absolute right-0 flex justify-between">
        <Button isOutline={true} onClick={handleReject} textBase={true}>
          Reject
        </Button>
        <Button onClick={openPasswordModal} textBase={true}>
          Allow
        </Button>
      </div>
      <ModalUnlock
        isModalUnlockOpen={unlock}
        handleModalUnlockClose={() => setUnlock(false)}
        handleUnlock={debouncedHandleAllow}
      />
    </ShellConnectPopup>
  );
};

export default connectWithConnectData(AllowCoinView);
