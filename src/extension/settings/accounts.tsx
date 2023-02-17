import ShellPopUp from '../components/shell-popup';
import ButtonList from '../components/button-list';
import InputIcon from '../components/input-icon';
import { useEffect, useState } from 'react';
import { walletRepository } from '../../infrastructure/storage/common';
import type { AccountDetails } from '../../infrastructure/repository';
import type { RestorationJSONDictionary } from '../../domain/account';
import {
  AccountFactory,
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
} from '../../domain/account';
import Button from '../components/button';
import { AccountType } from 'marina-provider';
import { extractErrorMessage } from '../utility/error';

const SettingsAccounts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Record<string, AccountDetails>>({});
  const [accountsList, setAccountsList] = useState<string[]>([]);

  const [error, setError] = useState<string>();

  useEffect(() => {
    (async () => {
      const accounts = await walletRepository.getAccountDetails();
      setAccounts(accounts);
      // ensure that the main accounts are always at the top of the list
      setAccountsList([
        MainAccount,
        MainAccountLegacy,
        MainAccountTest,
        ...Object.keys(accounts).filter(
          (name) => name !== MainAccount && name !== MainAccountLegacy && name !== MainAccountTest
        ),
      ]);
    })().catch(console.error);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = event.target.value.toLowerCase().replace('-', '');
    setSearchTerm(searchTerm);
  };

  const downloadIonioRestorationFile = async () => {
    try {
      setError(undefined);
      const ionioAccounts = Object.entries(accounts).filter(
        ([_, a]) => a.type === AccountType.Ionio
      );
      if (ionioAccounts.length === 0) throw new Error('no Ionio accounts found');
      const factory = await AccountFactory.create(walletRepository);
      const restoration: RestorationJSONDictionary = {
        liquid: [],
        testnet: [],
        regtest: [],
      };

      for (const [name, details] of ionioAccounts) {
        for (const net of details.accountNetworks) {
          const account = await factory.make(net, name);
          const restorationJSON = await account.restorationJSON();
          restoration[net].push(restorationJSON);
        }
      }

      const blob = new Blob([JSON.stringify(restoration)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'marina-ionio-restoration.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Wallet accounts"
    >
      <InputIcon
        className="my-4"
        imgIconPath="assets/images/search.svg"
        imgIconAlt="search"
        onChange={handleChange}
        type="search"
      />

      <div className="h-80">
        <ButtonList
          emptyText="no accounts on your Marina wallet"
          title="Accounts"
          titleColor="grayDark"
        >
          {accountsList
            .filter((name: string) => filterAccountsBySearchTerm(searchTerm)(name))
            .map((name: string) => [name, accounts[name]] as [string, AccountDetails])
            .map(([name, details], index) => (
              <div key={index} className="p-3 rounded-md shadow-md">
                <div className="flex-center flex flex-col align-middle">
                  <span className="text-primary mt-1 text-sm font-bold">
                    {name} ({details.type})
                  </span>
                  <span className="text-grayDark mt-1 text-sm">
                    {details.accountNetworks.join(', ')}
                  </span>
                </div>
              </div>
            ))}
        </ButtonList>
      </div>
      <div className="mt-1">
        <Button textBase={true} onClick={downloadIonioRestorationFile}>
          Download restoration JSON
        </Button>
        {error && <div className="text-red h-5 m-2 font-medium">{error}</div>}
      </div>
    </ShellPopUp>
  );
};

function filterAccountsBySearchTerm(term: string) {
  return (account: string) => account.toLowerCase().includes(term);
}
export default SettingsAccounts;
