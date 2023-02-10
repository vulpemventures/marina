import React, { useEffect, useState } from 'react';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utility/error';
import Browser from 'webextension-polyfill';
import { Account, MainAccount, MainAccountLegacy } from '../../../domain/account';
import {
  appRepository,
  onboardingRepository,
  useSelectIsFromPopupFlow,
  walletRepository,
} from '../../../infrastructure/storage/common';
import { initWalletRepository } from '../../../infrastructure/utils';

const GAP_LIMIT = 30;

const EndOfFlowOnboarding: React.FC = () => {
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
    try {
      const onboardingMnemonic = await onboardingRepository.getOnboardingMnemonic();
      const onboardingPassword = await onboardingRepository.getOnboardingPassword();
      setIsLoading(true);
      setErrorMsg(undefined);
      checkPassword(onboardingPassword);

      const { masterBlindingKey, defaultMainAccountXPub, defaultLegacyMainAccountXPub } = await initWalletRepository(walletRepository, onboardingMnemonic, onboardingPassword);

      // restore main accounts on Liquid network (so only MainAccount & MainAccountLegacy)
      const chainSource = await appRepository.getChainSource('liquid');
      if (!chainSource) {
        throw new Error('Chain source not found for liquid network');
      }

      const accountsToRestore = [
        new Account({
          name: MainAccount,
          chainSource,
          masterBlindingKey,
          masterPublicKey: defaultMainAccountXPub,
          walletRepository,
          network: 'liquid',
        }),
        new Account({
          name: MainAccountLegacy,
          chainSource,
          masterBlindingKey,
          masterPublicKey: defaultLegacyMainAccountXPub,
          walletRepository,
          network: 'liquid',
        }),
      ];

      // restore the accounts
      await Promise.allSettled(
        accountsToRestore.map((account) => account.sync(GAP_LIMIT))
      );

      // set the popup
      await Browser.browserAction.setPopup({ popup: 'popup.html' });
      await appRepository.updateStatus({ isOnboardingCompleted: true });
      await onboardingRepository.flush();
      await chainSource.close();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    tryToRestoreWallet().catch(console.error);
  }, [isFromPopup]);

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
