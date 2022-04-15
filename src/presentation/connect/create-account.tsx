import { IdentityType } from 'ldk';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setAccount } from '../../application/redux/actions/wallet';
import type { WithConnectDataProps } from '../../application/redux/containers/with-connect-data.container';
import { connectWithConnectData } from '../../application/redux/containers/with-connect-data.container';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import { selectEncryptedMnemonic } from '../../application/redux/selectors/wallet.selector';
import { SOMETHING_WENT_WRONG_ERROR } from '../../application/utils/constants';
import { decrypt } from '../../application/utils/crypto';
import type { CovenantAccountData } from '../../domain/account';
import { AccountType, initialRestorerOpts } from '../../domain/account';
import { CovenantIdentity } from '../../domain/covenant-identity';
import Button from '../components/button';
import ModalUnlock from '../components/modal-unlock';
import ShellConnectPopup from '../components/shell-connect-popup';
import PopupWindowProxy from './popupWindowProxy';
import * as ecc from 'tiny-secp256k1';

export interface CreateAccountPopupResponse {
  accepted: boolean;
}

const ConnectCreateAccount: React.FC<WithConnectDataProps> = ({ connectData }) => {
  const popupWindowProxy = new PopupWindowProxy<CreateAccountPopupResponse>();

  const [isModalUnlockOpen, showUnlockModal] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const encryptedMnemonic = useSelector(selectEncryptedMnemonic);
  const dispatch = useDispatch<ProxyStoreDispatch>();

  const handleModalUnlockClose = () => showUnlockModal(false);
  const handleUnlockModalOpen = () => showUnlockModal(true);

  const sendResponseMessage = (accepted: boolean) => {
    return popupWindowProxy.sendResponse({ data: { accepted } });
  };

  const rejectSignRequest = async () => {
    try {
      await sendResponseMessage(false);
    } catch (e) {
      console.error(e);
    }
    window.close();
  };

  const createAndSetNewAccount = async (password: string) => {
    try {
      if (!password || password.length === 0) throw new Error('Need password');
      const { createAccount } = connectData;
      if (!createAccount || !createAccount.namespace) throw new Error('Namespace is invalid');
      const identity = new CovenantIdentity({
        ecclib: ecc,
        type: IdentityType.Mnemonic,
        chain: 'liquid',
        opts: {
          mnemonic: decrypt(encryptedMnemonic, password),
          namespace: createAccount.namespace,
        },
      });

      await dispatch(
        setAccount<CovenantAccountData>(createAccount.namespace, {
          type: AccountType.CovenantAccount,
          covenantDescriptors: identity.covenant,
          restorerOpts: {
            liquid: initialRestorerOpts,
            regtest: initialRestorerOpts,
            testnet: initialRestorerOpts,
          },
          masterBlindingKey: identity.masterBlindingKey,
          masterXPub: identity.masterPublicKey,
        })
      );

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
          <h1 className="mt-8 text-2xl font-medium break-all">
            {connectData.createAccount?.hostname}
          </h1>
          <p className="mt-4 text-base font-medium">Requests you to create a new custom account</p>
          <p className="text-small mt-4 font-medium">
            {' '}
            <b>namespace:</b> {connectData.createAccount?.namespace}. <br />
          </p>

          <div className="bottom-24 container absolute right-0 flex justify-between">
            <Button isOutline={true} onClick={rejectSignRequest} textBase={true}>
              Reject
            </Button>
            <Button onClick={handleUnlockModalOpen} textBase={true}>
              Accept
            </Button>
          </div>
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

export default connectWithConnectData(ConnectCreateAccount);
