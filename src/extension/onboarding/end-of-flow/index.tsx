import React, { useEffect, useState } from 'react';
import Button from '../../components/button';
import MermaidLoader from '../../components/mermaid-loader';
import Shell from '../../components/shell';
import { extractErrorMessage } from '../../utility/error';
import Browser from 'webextension-polyfill';
import { Account } from '../../../domain/account';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../../domain/account-type';
import {
  appRepository,
  onboardingRepository,
  useSelectIsFromPopupFlow,
  walletRepository,
} from '../../../infrastructure/storage/common';
import { encrypt, hashPassword } from '../../../utils';
import { SLIP77Factory } from 'slip77';
import * as ecc from 'tiny-secp256k1';
import BIP32Factory from 'bip32';
import { mnemonicToSeedSync } from 'bip39';

const bip32 = BIP32Factory(ecc);
const slip77 = SLIP77Factory(ecc);

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

      const encryptedMnemonic = encrypt(onboardingMnemonic, onboardingPassword);
      const seed = mnemonicToSeedSync(onboardingMnemonic);
      const masterBlindingKey = slip77.fromSeed(seed).masterKey.toString('hex');
      const passwordHash = hashPassword(onboardingPassword);

      // set the global seed data
      await walletRepository.setSeedData(encryptedMnemonic, passwordHash, masterBlindingKey);

      // set the default accounts data (MainAccount, MainAccountTest, MainAccountLegacy)
      // cointype account (mainnet)
      const defaultMainAccountXPub = bip32
        .fromSeed(seed)
        .derivePath(Account.BASE_DERIVATION_PATH)
        .neutered()
        .toBase58();
      await walletRepository.updateAccountDetails(MainAccount, {
        masterPublicKey: defaultMainAccountXPub,
        baseDerivationPath: Account.BASE_DERIVATION_PATH,
        accountNetworks: ['liquid'],
      });

      // cointype account (testnet & regtest)
      const defaultMainAccountXPubTestnet = bip32
        .fromSeed(seed)
        .derivePath(Account.BASE_DERIVATION_PATH_TESTNET)
        .neutered()
        .toBase58();
      await walletRepository.updateAccountDetails(MainAccountTest, {
        masterPublicKey: defaultMainAccountXPubTestnet,
        baseDerivationPath: Account.BASE_DERIVATION_PATH_TESTNET,
        accountNetworks: ['regtest', 'testnet'],
      });

      // legacy account
      const defaultLegacyMainAccountXPub = bip32
        .fromSeed(seed)
        .derivePath(Account.BASE_DERIVATION_PATH_LEGACY)
        .neutered()
        .toBase58();
      await walletRepository.updateAccountDetails(MainAccountLegacy, {
        masterPublicKey: defaultLegacyMainAccountXPub,
        baseDerivationPath: Account.BASE_DERIVATION_PATH_LEGACY,
        accountNetworks: ['liquid', 'regtest', 'testnet'],
      });

      // restore on liquid
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
      const result = await Promise.allSettled(
        accountsToRestore.map((account) => account.sync(GAP_LIMIT))
      );
      console.warn(result);

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
