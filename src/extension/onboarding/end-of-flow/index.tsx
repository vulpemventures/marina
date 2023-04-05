import React, { useEffect, useState } from 'react';
import zkp from '@vulpemventures/secp256k1-zkp';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utility/error';
import Browser from 'webextension-polyfill';
import {
  AccountFactory,
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
  makeAccountXPub,
  SLIP13,
} from '../../../application/account';
import { useSelectIsFromPopupFlow } from '../../../infrastructure/storage/common';
import type { NetworkString } from 'marina-provider';
import { AccountType } from 'marina-provider';
import { mnemonicToSeed } from 'bip39';
import { initWalletRepository } from '../../../domain/repository';
import type { ChainSource } from '../../../domain/chainsource';
import { useStorageContext } from '../../context/storage-context';
import { UpdaterService } from '../../../application/updater';
import { Spinner } from './spinner';

const GAP_LIMIT = 30;

const EndOfFlowOnboarding: React.FC = () => {
  const { appRepository, onboardingRepository, walletRepository, assetRepository } =
    useStorageContext();
  const isFromPopup = useSelectIsFromPopupFlow();

  const [isLoading, setIsLoading] = useState(true);
  const [numberOfTransactionsToRestore, setNumberOfTransactionsToRestore] = useState(0);
  const [numberOfRestoredTransactions, setNumberOfRestoredTransactions] = useState(0);
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

      if (!onboardingMnemonic || !onboardingPassword) {
        throw new Error('onboarding Mnemonic or password not found');
      }
      setIsLoading(true);
      setErrorMsg(undefined);
      checkPassword(onboardingPassword);

      await initWalletRepository(walletRepository, onboardingMnemonic, onboardingPassword);
      await (Browser.browserAction ?? Browser.action).setPopup({ popup: 'popup.html' });
      await appRepository.updateStatus({ isOnboardingCompleted: true });

      // restore main accounts on Liquid network (so only MainAccount & MainAccountLegacy)
      const liquidChainSource = await appRepository.getChainSource('liquid');
      if (!liquidChainSource) {
        throw new Error('Chain source not found for liquid network');
      }
      const testnetChainSource = await appRepository.getChainSource('testnet');
      if (!testnetChainSource) {
        throw new Error('Chain source not found for testnet network');
      }

      const factory = await AccountFactory.create(walletRepository);
      // restore liquid & testnet main accounts
      const accountsToRestore = await Promise.all([
        factory.make('liquid', MainAccount),
        factory.make('liquid', MainAccountLegacy),
        factory.make('testnet', MainAccountLegacy),
        factory.make('testnet', MainAccountTest),
      ]);

      // start an Updater service (fetch & unblind & persist the transactions)
      const updaterSvc = new UpdaterService(
        walletRepository,
        appRepository,
        assetRepository,
        await zkp()
      );
      await updaterSvc.start();
      walletRepository.onNewTransaction(() =>
        Promise.resolve(setNumberOfRestoredTransactions((n) => n + 1))
      );

      // restore on other networks will be triggered if the user switch to testnet/regtest in settings
      await Promise.allSettled(
        accountsToRestore.map((account) =>
          account
            .sync(
              account.network.name === 'liquid' ? liquidChainSource : testnetChainSource,
              GAP_LIMIT,
              { internal: 0, external: 0 }
            )
            .then(({ txIDsFromChain }) =>
              setNumberOfTransactionsToRestore((n) => n + txIDsFromChain.length)
            )
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
        let chainSourceRegtest: ChainSource | null = null;
        // restore the accounts
        const factory = await AccountFactory.create(walletRepository);
        for (const [network, restorations] of Object.entries(restoration)) {
          let chainSource = undefined;
          if (network === 'liquid') chainSource = liquidChainSource;
          else if (network === 'testnet') chainSource = testnetChainSource;
          else if (network === 'regtest') {
            if (!chainSourceRegtest) {
              chainSourceRegtest = await appRepository.getChainSource('regtest');
              if (!chainSourceRegtest) {
                throw new Error('Chain source not found for regtest network');
              }
            }
            chainSource = chainSourceRegtest;
          }
          if (!chainSource) throw new Error(`Chain source not found for ${network} network`);

          for (const restoration of restorations) {
            const account = await factory.make(network as NetworkString, restoration.accountName);
            await account.restoreFromJSON(chainSource, restoration);
          }
        }

        // close the chain source if opened
        await chainSourceRegtest?.close();
      }
      await liquidChainSource.close();

      // after all task, wait for the updater if processing
      await updaterSvc.waitForProcessing();
      await updaterSvc.stop();

      // set the popup
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
  }, [isFromPopup]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-24">
        <MermaidLoader className="h-1/2 flex items-center justify-center" />
        <p>We are restoring your wallet. This can take a while, please do not close this window.</p>
        {numberOfTransactionsToRestore > 0 && (
          <div className="flex flex-col items-center justify-center mt-4">
            <Spinner />
            <p className="text-primary mt-1 font-semibold">
              {numberOfRestoredTransactions}/{numberOfTransactionsToRestore} Transactions
            </p>
          </div>
        )}
      </div>
    );
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
