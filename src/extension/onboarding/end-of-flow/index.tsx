import React, { useEffect, useState } from 'react';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utility/error';
import Browser from 'webextension-polyfill';
import { Account, AccountFactory, MainAccount, MainAccountLegacy } from '../../../domain/account';
import {
  appRepository,
  onboardingRepository,
  useSelectIsFromPopupFlow,
  walletRepository,
} from '../../../infrastructure/storage/common';
import { initWalletRepository, makeAccountXPub } from '../../../infrastructure/utils';
import type { NetworkString } from 'marina-provider';
import { AccountType } from 'marina-provider';
import { SLIP13 } from '../../../utils';
import { mnemonicToSeed } from 'bip39';
import type { ChainSource } from '../../../domain/chainsource';

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

      const { masterBlindingKey, defaultMainAccountXPub, defaultLegacyMainAccountXPub } =
        await initWalletRepository(walletRepository, onboardingMnemonic, onboardingPassword);

      // restore main accounts on Liquid network (so only MainAccount & MainAccountLegacy)
      const liquidChainSource = await appRepository.getChainSource('liquid');
      if (!liquidChainSource) {
        throw new Error('Chain source not found for liquid network');
      }

      const accountsToRestore = [
        new Account({
          name: MainAccount,
          masterBlindingKey,
          masterPublicKey: defaultMainAccountXPub,
          walletRepository,
          network: 'liquid',
        }),
        new Account({
          name: MainAccountLegacy,
          masterBlindingKey,
          masterPublicKey: defaultLegacyMainAccountXPub,
          walletRepository,
          network: 'liquid',
        }),
      ];

      // restore the Main accounts on mainnet only
      // restore on other networks will be triggered if the user switch to testnet/regtest in settings
      await Promise.allSettled(
        accountsToRestore.map((account) =>
          account.sync(liquidChainSource, GAP_LIMIT, { internal: 0, external: 0 })
        )
      );

      // restore the custom accounts if there is restoration file set
      const restoration = await onboardingRepository.getRestorationJSONDictionary();
      if (restoration) {
        const accountsToRestore: Record<string, Array<NetworkString>> = {};
        for (const [network, restorations] of Object.entries(restoration)) {
          const accountNames = restorations.map((r) => r.accountName);
          for (const accountName of accountNames) {
            if (!accountsToRestore[accountName]) {
              accountsToRestore[accountName] = [];
            }
            accountsToRestore[accountName].push(network as NetworkString);
          }
        }

        const seed = await mnemonicToSeed(onboardingMnemonic);
        // create the account details
        for (const [accountName, accountNetworks] of Object.entries(accountsToRestore)) {
          const baseDerivationPath = SLIP13(accountName);
          const masterXPub = makeAccountXPub(seed, baseDerivationPath);
          await walletRepository.updateAccountDetails(accountName, {
            accountID: accountName,
            baseDerivationPath,
            masterXPub,
            accountNetworks,
            type: AccountType.Ionio,
          });
        }

        // we already opened the Liquid chain source
        const chainSourcesTestnetRegtest: Record<string, ChainSource | undefined> = {
          testnet: undefined,
          regtest: undefined,
        };
        // restore the accounts
        const factory = await AccountFactory.create(walletRepository);
        for (const [network, restorations] of Object.entries(restoration)) {
          let chainSource = undefined;
          if (network === 'liquid') chainSource = liquidChainSource;
          else {
            if (chainSourcesTestnetRegtest[network] === undefined) {
              const chainSource = await appRepository.getChainSource(network as NetworkString);
              chainSourcesTestnetRegtest[network] = chainSource ?? undefined;
            }
            chainSource = chainSourcesTestnetRegtest[network];
          }
          if (!chainSource) throw new Error(`Chain source not found for ${network} network`);

          for (const restoration of restorations) {
            const account = await factory.make(network as NetworkString, restoration.accountName);
            await account.restoreFromJSON(chainSource, restoration);
          }
        }

        // close the chain sources
        await chainSourcesTestnetRegtest.testnet?.close();
        await chainSourcesTestnetRegtest.regtest?.close();
      }

      // set the popup
      await Browser.browserAction.setPopup({ popup: 'popup.html' });
      await appRepository.updateStatus({ isOnboardingCompleted: true });
      await onboardingRepository.flush();
      await liquidChainSource.close();
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
