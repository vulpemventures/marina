import { useState } from 'react';
import { SOMETHING_WENT_WRONG_ERROR } from '../../domain/constants';
import Button from '../components/button';
import ButtonsAtBottom from '../components/buttons-at-bottom';
import ModalUnlock from '../components/modal-unlock';
import ShellConnectPopup from '../components/shell-connect-popup';
import { useSelectPopupCreateAccountParameters } from '../../infrastructure/storage/common';
import { popupResponseMessage } from '../../domain/message';
import { decrypt } from '../../domain/encryption';
import { mnemonicToSeedSync } from 'bip39';
import type { CreateAccountParameters } from '../../domain/repository';
import { makeAccountXPub, SLIP13 } from '../../application/account';
import { useStorageContext } from '../context/storage-context';
import { useBackgroundPortContext } from '../context/background-port-context';

export interface CreateAccountPopupResponse {
  accepted: boolean;
}

const ConnectCreateAccount: React.FC = () => {
  const { walletRepository } = useStorageContext();
  const { backgroundPort } = useBackgroundPortContext();
  const parameters = useSelectPopupCreateAccountParameters();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean) => {
    return backgroundPort.sendMessage(popupResponseMessage({ accepted }));
  };

  const rejectResponseMessage = async (error: string) => {
    try {
      await backgroundPort.sendMessage(popupResponseMessage({ accepted: false }, error));
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const createAndSetNewAccount = async (password: string, params: CreateAccountParameters) => {
    try {
      if (!password || password.length === 0) throw new Error('need password');

      const encrypted = await walletRepository.getEncryptedMnemonic();
      if (!encrypted) throw new Error('no wallet seed');

      const mnemonic = await decrypt(encrypted, password);

      const allAccounts = await walletRepository.getAccountDetails();
      const allAccountsNames = Object.keys(allAccounts);
      if (allAccountsNames.includes(params.name)) {
        throw new Error(`account with name ${params.name} already exists`);
      }

      const baseDerivationPath = SLIP13(params.name);
      const masterPublicKey = makeAccountXPub(mnemonicToSeedSync(mnemonic), baseDerivationPath);

      await walletRepository.updateAccountDetails(params.name, {
        accountID: params.name,
        type: params.accountType,
        accountNetworks: ['liquid', 'testnet', 'regtest'],
        baseDerivationPath,
        masterXPub: masterPublicKey,
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
            <b>account type:</b> {parameters?.accountType} <br />
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
            disabled={parameters === undefined}
          >
            Unlock
          </Button>
        </>
      )}
      {parameters && (
        <ModalUnlock
          isModalUnlockOpen={isModalUnlockOpen}
          handleModalUnlockClose={handleModalUnlockClose}
          handleUnlock={async (password: string) =>
            await createAndSetNewAccount(password, parameters)
          }
        />
      )}
    </ShellConnectPopup>
  );
};

export default ConnectCreateAccount;
