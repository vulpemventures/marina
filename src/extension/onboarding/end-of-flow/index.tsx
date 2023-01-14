import React, { useEffect, useState } from 'react';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utility/error';
import Browser from 'webextension-polyfill';
import { Account, createAccountDetails } from '../../../domain/account';
import type { NetworkString } from 'marina-provider';
import { MainAccountName } from '../../../domain/account-type';
import {
  appRepository,
  onboardingRepository,
  useSelectIsFromPopupFlow,
  useSelectOnboardingMnemonic,
  useSelectOnboardingPassword,
  walletRepository,
} from '../../../infrastructure/storage/common';

const GAP_LIMIT = 20;

const EndOfFlowOnboarding: React.FC = () => {
  const onboardingMnemonic = useSelectOnboardingMnemonic();
  const onboardingPassword = useSelectOnboardingPassword();
  const isFromPopup = useSelectIsFromPopupFlow();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>();

  const tryToRestoreWallet = async () => {
    if (isFromPopup) {
      // if the user is here to check its mnemonic, we just update the status of the wallet
      await appRepository.updateStatus({ isMnemonicVerified: true });
      setIsLoading(false);
      return;
    }
    if (!onboardingMnemonic || !onboardingPassword) return;

    try {
      setIsLoading(true);
      setErrorMsg(undefined);
      checkPassword(onboardingPassword);

      const { encryptedMnemonic, passwordHash, masterBlindingKey, masterPublicKey } =
        createAccountDetails(onboardingMnemonic, onboardingPassword);

      // set the main account details
      const mainAccountNetworks: NetworkString[] = ['liquid', 'testnet', 'regtest'];
      await walletRepository.setSeedData(encryptedMnemonic, passwordHash, masterBlindingKey);
      await walletRepository.updateAccountDetails(MainAccountName, {
        masterPublicKey,
        baseDerivationPath: Account.BASE_DERIVATION_PATH,
        accountNetworks: mainAccountNetworks,
      });

      const chainSource = await appRepository.getChainSource('liquid');
      if (!chainSource) throw new Error(`Chain source not found for network "liquid"`);
      const account = new Account({
        chainSource,
        network: 'liquid',
        name: MainAccountName,
        masterPublicKey,
        masterBlindingKey,
        walletRepository,
      });

      // restore the accounts
      await Promise.allSettled([account.sync(GAP_LIMIT)]);

      // set the popup
      await Browser.browserAction.setPopup({ popup: 'popup.html' });
      await appRepository.updateStatus({ isOnboardingCompleted: true });
      await onboardingRepository.flush();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    tryToRestoreWallet().catch(console.error);
  }, [onboardingMnemonic, onboardingPassword, isFromPopup]);

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

export default EndOfFlowOnboarding;

function checkPassword(password: string) {
  if (password === undefined || password === null || password.length < 8)
    throw new Error(`Password must be 8 chars min`);
}
