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
import { greedyCoinSelector, UtxoInterface } from 'ldk';
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
import { addAllowedCoin } from '../../application/redux/actions/allowance';
import { assetGetterFromIAssets } from '../../domain/assets';
import { fromSatoshi } from '../utils';

/**
 * All a set of utxos to be spent later.
 * use SIGHASH_NONE to sign the inputs
 * @param identity the signer
 * @param utxos the coins to approve
 */
async function createAllowCoinsPset(
  identity: MultisigWithCosigner,
  utxos: UtxoInterface[],
  network: Network
): Promise<string> {
  const pset = new Psbt({ network: networkFromString(network) });

  for (const utxo of utxos) {
    pset.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: utxo.prevout,
      sighashType: Transaction.SIGHASH_NONE + Transaction.SIGHASH_ANYONECANPAY,
    });
  }

  return identity.allow(pset.toBase64());
}

const AllowCoinView: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const network = useSelector((state: RootReducerState) => state.app.network);
  const restrictedAssetAccount = useSelector(selectRestrictedAssetAccount);
  const utxos = useSelector(selectUtxos(RestrictedAssetAccountID));
  const getAsset = useSelector((state: RootReducerState) => assetGetterFromIAssets(state.assets));

  const [unlock, setUnlock] = useState(false);
  const [error, setError] = useState<string>();
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const popupWindowProxy = new PopupWindowProxy<string>();

  const handleReject = async () => {
    await popupWindowProxy.sendResponse({ data: '' });
    window.close();
  };

  const openPasswordModal = () => {
    setError(undefined);
    setUnlock(true);
  };

  const handleAllow = async (password: string) => {
    if (!connectData.allowance?.requestParam) throw new Error('no coin to allow');
    if (!restrictedAssetAccount)
      throw new Error('multisig account is undefined, u maybe need to pair with a cosigner');

    try {
      const id = await restrictedAssetAccount.getSigningIdentity(password);
      const changeAddress = (await id.getNextChangeAddress()).confidentialAddress;

      const { selectedUtxos } = greedyCoinSelector()(
        utxos,
        connectData.allowance.requestParam.map((p) => ({ ...p, value: p.amount, address: '' })),
        () => changeAddress
      );

      const allowPset = await createAllowCoinsPset(id, selectedUtxos, network);

      await Promise.all(selectedUtxos.map(addAllowedCoin).map(dispatch));
      await popupWindowProxy.sendResponse({ data: allowPset });

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

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Enable"
    >
      <h1 className="mt-8 text-2xl font-medium break-all">Allow</h1>

      <p className="mt-12 text-base font-medium">Allow website to spend: </p>
      <div>
        {error && <p className="text-red">{error}</p>}
        {connectData.allowance?.requestParam &&
          connectData.allowance.requestParam.map(({ asset, amount }, index) => (
            <p key={`${asset}${index}`}>{`${fromSatoshi(amount, getAsset(asset).precision)} ${
              getAsset(asset).ticker
            }`}</p>
          ))}
      </div>
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
