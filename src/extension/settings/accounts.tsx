import ShellPopUp from '../components/shell-popup';
import ButtonList from '../components/button-list';
import InputIcon from '../components/input-icon';
import { useEffect, useState } from 'react';
import { walletRepository } from '../../infrastructure/storage/common';
import type { AccountDetails } from '../../infrastructure/repository';
import { MainAccount, MainAccountLegacy, MainAccountTest } from '../../domain/account';

const SettingsAccounts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Record<string, AccountDetails>>({});
  const [accountsList, setAccountsList] = useState<string[]>([]);

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
    </ShellPopUp>
  );
};

function filterAccountsBySearchTerm(term: string) {
  return (account: string) => account.toLowerCase().includes(term);
}
export default SettingsAccounts;
