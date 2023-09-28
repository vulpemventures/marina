import { mnemonicToSeedSync } from 'bip39';
import type { NetworkString } from 'marina-provider';
import { AccountType } from 'marina-provider';
import { useState } from 'react';
import { AccountFactory, makeAccountXPub, SLIP13 } from '../../application/account';
import type { RestorationJSONDictionary } from '../../domain/backup';
import type { ChainSource } from '../../domain/chainsource';
import { decrypt } from '../../domain/encryption';
import IonioRestorationForm from '../components/ionio-restoration-form';
import ShellPopUp from '../components/shell-popup';
import { useStorageContext } from '../context/storage-context';
import { extractErrorMessage } from '../utility/error';

const SettingsAccountsRestoreIonio: React.FC = () => {
  const { walletRepository, appRepository } = useStorageContext();

  const [errorMsg, setErrorMsg] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (dict: RestorationJSONDictionary, password: string) => {
    setIsLoading(true);
    setErrorMsg(undefined);
    const allAccounts = await walletRepository.getAccountDetails();
    const encrypted = await walletRepository.getEncryptedMnemonic();
    if (!encrypted) throw new Error('no wallet seed');
    const mnemonic = await decrypt(encrypted, password);
    const seed = mnemonicToSeedSync(mnemonic);

    const factory = await AccountFactory.create(walletRepository);

    const newAccounts: string[] = [];

    for (const [network, restorations] of Object.entries(dict)) {
      let chainSource: ChainSource | null;

      try {
        chainSource = await appRepository.getChainSource(network as NetworkString, false);
        if (!chainSource) throw new Error(`not connected to ${network} network, cannot restore`);
      } catch (e) {
        console.warn(e);
        continue;
      }

      for (const restoration of restorations) {
        const accountName = restoration.accountName;
        // create the account if it doesn't exist
        if (!allAccounts[accountName] && !newAccounts.includes(accountName)) {
          const baseDerivationPath = SLIP13(accountName);
          const masterXPub = makeAccountXPub(seed, baseDerivationPath);
          await walletRepository.updateAccountDetails(accountName, {
            accountID: accountName,
            baseDerivationPath,
            masterXPub,
            accountNetworks: ['liquid', 'testnet', 'regtest'],
            type: AccountType.Ionio,
          });
          newAccounts.push(accountName);
        }

        const account = await factory.make(network as NetworkString, accountName);
        await account.restoreFromJSON(chainSource, restoration);
      }

      try {
        await chainSource.close();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Restore Ionio accounts"
    >
      <IonioRestorationForm
        onSubmit={async (dict, password) =>
          handleSubmit(dict, password)
            .catch((e) => setErrorMsg(extractErrorMessage(e)))
            .finally(() => setIsLoading(false))
        }
      />
      {errorMsg && <p className="mt-4 text-red-500">{errorMsg}</p>}
      {isLoading && <p className="mt-4 text-gray-500">Restoring accounts...</p>}
    </ShellPopUp>
  );
};

export default SettingsAccountsRestoreIonio;
