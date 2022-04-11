import type { NetworkString } from 'ldk';
import { IdentityType, Mnemonic, mnemonicRestorerFromEsplora } from 'ldk';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { onboardingCompleted, reset } from '../../../application/redux/actions/app';
import { flushOnboarding } from '../../../application/redux/actions/onboarding';
import {
  setEncryptedMnemonic,
  setVerified,
  setAccount,
} from '../../../application/redux/actions/wallet';
import type { ProxyStoreDispatch } from '../../../application/redux/proxyStore';
import { walletInitState } from '../../../application/redux/reducers/wallet-reducer';
import { encrypt, hashPassword } from '../../../application/utils/crypto';
import { setUpPopup } from '../../../application/utils/popup';
import { getStateRestorerOptsFromAddresses } from '../../../application/utils/restorer';
import { AccountType, MainAccountID, MnemonicAccountData } from '../../../domain/account';
import { createMasterBlindingKey } from '../../../domain/master-blinding-key';
import { createMasterXPub } from '../../../domain/master-extended-pub';
import { createMnemonic } from '../../../domain/mnemonic';
import type { Password } from '../../../domain/password';
import { createPassword } from '../../../domain/password';
import type { PasswordHash } from '../../../domain/password-hash';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utils/error';
import ecc from '../../../ecclib';

export interface EndOfFlowProps {
  mnemonic: string;
  password: string;
  isFromPopupFlow: boolean;
  network: NetworkString;
  explorerURL: string;
  hasMnemonicRegistered: boolean;
  walletVerified: boolean;
}

const EndOfFlowOnboardingView: React.FC<EndOfFlowProps> = ({
  mnemonic,
  password,
  isFromPopupFlow,
  network,
  explorerURL,
  hasMnemonicRegistered,
  walletVerified,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>();

  const tryToRestoreWallet = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(undefined);

      if (!isFromPopupFlow) {
        const { accountData, passwordHash } = await createWalletFromMnemonic(
          createPassword(password),
          createMnemonic(mnemonic),
          network,
          explorerURL
        );

        if (hasMnemonicRegistered) {
          await dispatch(reset());
        }

        await dispatch(setEncryptedMnemonic(accountData.encryptedMnemonic, passwordHash));
        await dispatch(setAccount<MnemonicAccountData>(MainAccountID, accountData));
        // set the popup
        await setUpPopup();
        await dispatch(onboardingCompleted());
      }

      if (walletVerified) {
        // the user has confirmed via seed-confirm page
        await dispatch(setVerified());
      }
      await dispatch(flushOnboarding());
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    tryToRestoreWallet().catch(console.error);
  }, []);

  if (isLoading) {
    return <MermaidLoader className="flex items-center justify-center h-screen p-24" />;
  }

  return (
    <Shell hasBackBtn={false}>
      <h1 className="text-5xl">{errorMsg ? 'Restoration failed' : 'Congratulations!'}</h1>
      <p className="mt-4">
        {errorMsg ??
          'Your wallet is ready. You can close this page and open the extension from the browser toolbar'}
      </p>

      {errorMsg && (
        <Button
          className="w-36 container mx-auto mt-4"
          onClick={tryToRestoreWallet}
          textBase={true}
        >
          Retry
        </Button>
      )}

      {!errorMsg && (
        <img className="w-72 mb-14 mt-10" src="/assets/images/mermaid.png" alt="mermaid" />
      )}
    </Shell>
  );
};

export async function createWalletFromMnemonic(
  password: Password,
  mnemonic: string,
  chain: NetworkString,
  esploraURL: string
): Promise<{ accountData: MnemonicAccountData; passwordHash: PasswordHash }> {
  const toRestore = new Mnemonic({
    ecclib: ecc,
    chain,
    type: IdentityType.Mnemonic,
    opts: { mnemonic },
  });

  const mnemonicIdentity = await mnemonicRestorerFromEsplora(toRestore)({
    esploraURL,
    gapLimit: 20,
  });
  const masterXPub = createMasterXPub(mnemonicIdentity.masterPublicKey);
  const masterBlindingKey = createMasterBlindingKey(mnemonicIdentity.masterBlindingKey);
  const encryptedMnemonic = encrypt(mnemonic, password);
  const passwordHash = hashPassword(password);
  const addresses = await mnemonicIdentity.getAddresses();

  const accountData: MnemonicAccountData = {
    type: AccountType.SingleSigAccount,
    restorerOpts: {
      ...walletInitState.accounts[MainAccountID].restorerOpts,
      [chain]: getStateRestorerOptsFromAddresses(addresses),
    },
    encryptedMnemonic,
    masterXPub,
    masterBlindingKey,
  };

  return {
    accountData,
    passwordHash,
  };
}

export default EndOfFlowOnboardingView;
