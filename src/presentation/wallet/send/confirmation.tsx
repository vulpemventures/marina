import React, { useContext, useState } from 'react';
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
  blindingKeyFromAddress,
  isConfidentialAddress,
  receipientOutIndexFromTx,
} from '../../utils';

const assetInfoByHash: Record<string, any> = {
  '5ac9f65c0efcc4775e0baec4ec03abdde22473cd3cf33c0419ca290e0751b225': {
    ticker: 'L-BTC',
    name: 'Liquid Bitcoin',
    imgPath: 'assets/images/liquid-assets/liquid-btc.svg',
  },
  '2dc8bb2d1855a87cb0901e7c024830a0baa09c3a1e7987705cb318b6bbc43823': {
    ticker: 'USDt',
    name: 'Tether',
    imgPath: 'assets/images/liquid-assets/liquid-tether.png',
  },
};

const Confirmation: React.FC = () => {
  const [{ wallets, app }, dispatch] = useContext(AppContext);

  if (!wallets[0].pendingTx) {
    return <>Loading...</>;
  }

  const history = useHistory();
  const {
    sendAddress,
    sendAsset,
    sendAmount,
    feeAsset,
    feeAmount,
    value,
  } = wallets[0].pendingTx!.props;
  const [isModalUnlockOpen, showUnlockModal] = useState(false);

  const handleModalUnlockCancel = () => showUnlockModal(false);
  const handleShowMnemonic = async (password: string) => {
    const pwd = Password.create(password);
    let mnemonic: string;
    if (hash(pwd).equals(wallets[0].passwordHash)) {
      mnemonic = decrypt(wallets[0].encryptedMnemonic, Password.create(password)).value;
    } else {
      throw new Error('Invalid password');
    }

    let outPubkeys: Map<number, string> = new Map();
    if (isConfidentialAddress(sendAddress)) {
      const receipientOutIndex = receipientOutIndexFromTx(value, sendAddress);
      const receipientBlindingKey = blindingKeyFromAddress(sendAddress);
      outPubkeys.set(receipientOutIndex, receipientBlindingKey);
    }

    const tx: string = await blindAndSignPset(
      mnemonic,
      wallets[0].confidentialAddresses,
      app.network.value,
      wallets[0].pendingTx!.value,
      outPubkeys
    );

    console.log('FINAL TRANSACTION', tx);
    // TODO: broadcast transaction

    const onError = (err: Error) => {
      console.log(err);
    };
    const onSuccess = () => {
      dispatch(
        unsetPendingTx(() => {
          dispatch(flush());
          history.push(DEFAULT_ROUTE);
          browser.browserAction.setBadgeText({ text: '' });
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
  };

  const handleSend = () => showUnlockModal(true);

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Confirmation"
    >
      <h1 className="text-2xl">{assetInfoByHash[sendAsset].name}</h1>
      <img
        className="w-11 mt-0.5 block mx-auto mb-2"
        src={assetInfoByHash[sendAsset].imgPath}
        alt="liquid bitcoin logo"
      />

      <div className="px-3 mt-3">
        <h2 className="text-lg font-medium text-left">To</h2>
        <p className="font-regular text-sm text-left break-all">{sendAddress}</p>
      </div>

      <div className="bg-gradient-to-r from-secondary to-primary flex flex-row items-center justify-between h-12 px-4 mt-4 rounded-full">
        <span className="text-lg font-medium">Amount</span>
        <span className="text-base font-medium text-white">{`${(
          sendAmount / Math.pow(10, 8)
        ).toString()} ${assetInfoByHash[sendAsset].ticker}`}</span>
      </div>

      <div className="flex flex-row justify-between px-3 mt-10">
        <span className="text-lg font-medium">Fee</span>
        <span className="font-regular text-base">{`${(feeAmount / Math.pow(10, 8)).toFixed(8)} ${
          assetInfoByHash[feeAsset].ticker
        }`}</span>
      </div>

      <Button className="bottom-20 right-8 absolute" onClick={handleSend}>
        Send
      </Button>

      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockCancel}
        handleShowMnemonic={handleShowMnemonic}
      />
    </ShellPopUp>
  );
};

export default Confirmation;
