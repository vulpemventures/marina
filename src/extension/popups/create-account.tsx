import { useState } from 'react';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import { crypto } from 'liquidjs-lib';
import { SOMETHING_WENT_WRONG_ERROR } from '../../constants';
import { AccountType } from '../../domain/account-type';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import ModalUnlock from '../components/modal-unlock';
import ShellConnectPopup from '../components/shell-connect-popup';
import PopupWindowProxy from './popupWindowProxy';
import {
  appRepository,
  useSelectPopupCreateAccountParameters,
  walletRepository,
} from '../../infrastructure/storage/common';
import { popupResponseMessage } from '../../domain/message';
import { decrypt } from '../../encryption';
import { mnemonicToSeedSync } from 'bip39';

const bip32 = BIP32Factory(ecc);

export interface CreateAccountPopupResponse {
  accepted: boolean;
}

// slip13: https://github.com/satoshilabs/slips/blob/master/slip-0013.md#hd-structure
function SLIP13(namespace: string): string {
  const hash = crypto.sha256(Buffer.from(namespace));
  const hash128 = hash.subarray(0, 16);
  const A = hash128.readUInt32LE(0) || 0x80000000;
  const B = hash128.readUint32LE(4) || 0x80000000;
  const C = hash128.readUint32LE(8) || 0x80000000;
  const D = hash128.readUint32LE(12) || 0x80000000;
  return `m/${A}/${B}/${C}/${D}`;
}

const ConnectCreateAccount: React.FC = () => {
  const popupWindowProxy = new PopupWindowProxy<CreateAccountPopupResponse>();
  const parameters = useSelectPopupCreateAccountParameters();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean) => {
    return popupWindowProxy.sendResponse(popupResponseMessage({ accepted }));
  };

  const rejectResponseMessage = async (error: string) => {
    try {
      await popupWindowProxy.sendResponse(popupResponseMessage({ accepted: false }, error));
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const createAndSetNewAccount = async (password: string) => {
    try {
      if (!password || password.length === 0) throw new Error('need password');
      if (!parameters) throw new Error('need createAccount parameters');

      const network = await appRepository.getNetwork();
      if (!network) throw new Error('no network network selected, cannot create account');

      const encrypted = await walletRepository.getEncryptedMnemonic();
      if (!encrypted) throw new Error('no wallet seed');

      const mnemonic = await decrypt(encrypted, password);

      const allAccounts = await walletRepository.getAccountDetails();
      const allAccountsNames = Object.keys(allAccounts);
      if (allAccountsNames.includes(parameters.name)) {
        throw new Error(`account with name ${parameters.name} already exists`);
      }

      const baseDerivationPath = SLIP13(parameters.name);
      const masterPublicKey = bip32
        .fromSeed(mnemonicToSeedSync(mnemonic))
        .derivePath(baseDerivationPath)
        .neutered()
        .toBase58();

      await walletRepository.updateAccountDetails(parameters.name, {
        accountType: AccountType.Ionio,
        accountNetworks: [network],
        baseDerivationPath,
        masterPublicKey,
      });

      await sendResponseMessage(true);
      window.close();
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error) {
        setError(e.message);
      }
    }

    handleModalUnlockClose();
  };

  // send response message false when user closes the window without answering
  window.addEventListener('beforeunload', () => sendResponseMessage(false));

  return (
    <ShellConnectPopup
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Create account"
    >
      {error.length === 0 ? (
        <>
          <h1 className="mt-8 text-2xl font-medium break-all">{parameters?.hostname}</h1>
          <p className="mt-4 text-base font-medium">Requests you to create a new custom account</p>
          <p className="text-small mt-4 font-medium">
            {' '}
            <b>namespace:</b> {parameters?.name} <br />
          </p>

          <ButtonsAtBottom>
            <Button
              isOutline={true}
              onClick={() => rejectResponseMessage('user rejected the create-account request')}
              textBase={true}
            >
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
          >
            Unlock
          </Button>
        </>
      )}
      <ModalUnlock
        isModalUnlockOpen={isModalUnlockOpen}
        handleModalUnlockClose={handleModalUnlockClose}
        handleUnlock={createAndSetNewAccount}
      />
    </ShellConnectPopup>
  );
};

export default ConnectCreateAccount;
