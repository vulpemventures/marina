import ShellPopUp from '../components/shell-popup';
import ButtonList from '../components/button-list';
import InputIcon from '../components/input-icon';
import { useEffect, useState } from 'react';
import type { AccountDetails } from '../../domain/account-type';
import { walletRepository } from '../../infrastructure/storage/common';

// TODO account icons ??
function getImgFilename(name: string): string {
  return 'circle.svg';
}

const AccountIcon: React.FC<{ name: string }> = ({ name }) => {
  return (
    <img
      className="w-8 mr-1.5"
      src={`assets/images/${getImgFilename(name)}`}
      alt="receive transaction"
    />
  );
};

const SettingsAccounts: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Record<string, AccountDetails>>({});

  useEffect(() => {
    (async () => {
      setAccounts(await walletRepository.getAccountDetails());
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

      <div className="max-h-80">
        <ButtonList
          emptyText="no accounts on your Marina wallet"
          title="Change account"
          titleColor="grayDark"
        >
          {Object.entries(accounts)
            .filter(([name, details]) => filterAccountsBySearchTerm(searchTerm)(name))
            .map(([name, details], index) => (
              <div key={index} className="p-3 rounded-md shadow-md">
                <div className="flex-center flex align-middle">
                  <AccountIcon name={name} />
                  <span className="text-grayDark mt-1 align-text-bottom">
                    {name} ({details.baseDerivationPath})
                    <br />
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
