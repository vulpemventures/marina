import ShellPopUp from '../components/shell-popup';
import ButtonList from '../components/button-list';
import InputIcon from '../components/input-icon';
import { useEffect, useState } from 'react';
import type { AccountDetails, WalletRepository } from '../../domain/repository';
import type { RestorationJSONDictionary } from '../../application/account';
import {
  AccountFactory,
  MainAccount,
  MainAccountLegacy,
  MainAccountTest,
} from '../../application/account';
import { useStorageContext } from '../context/storage-context';
import { AccountType } from 'marina-provider';
import Button from '../components/button';
import { useHistory } from 'react-router';
import { SETTINGS_ACCOUNTS_RESTORE_IONIO_ROUTE } from '../routes/constants';
import { useToastContext } from '../context/toast-context';
import { extractErrorMessage } from '../utility/error';

const SettingsAccounts: React.FC = () => {
  const { walletRepository } = useStorageContext();
  const { showToast } = useToastContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Record<string, AccountDetails>>({});
  const [accountsList, setAccountsList] = useState<string[]>([]);
  const history = useHistory();

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
        <ButtonList emptyText="no accounts on your Marina wallet" title="" titleColor="grayDark">
          {accountsList
            .filter((name: string) => filterAccountsBySearchTerm(searchTerm)(name))
            .map((name: string) => [name, accounts[name]] as [string, AccountDetails])
            .map(([name, details], index) => (
              <div key={index} className="p-3 rounded-md shadow-md">
                <div className="flex-center flex flex-col align-middle">
                  <span className="text-primary mt-1 text-sm font-bold">
                    {name} ({details.type.toUpperCase()})
                  </span>
                  <span className="text-grayDark text-10 mt-1">
                    {details.accountNetworks.join(', ')}
                  </span>
                  {[MainAccount, MainAccountLegacy, MainAccountTest].includes(name) && (
                    <span className="text-grayDark text-10 mt-1">{details.baseDerivationPath}</span>
                  )}
                </div>
              </div>
            ))}
        </ButtonList>
      </div>

      <div className="w-48 mx-auto border-b-0.5 border-primary pt-1.5" />
      <h3 className="text-primary font-bold">Ionio</h3>
      <Button
        className="m-2"
        isOutline
        onClick={() => history.push(SETTINGS_ACCOUNTS_RESTORE_IONIO_ROUTE)}
      >
        Restore
      </Button>

      <Button
        className="m-2"
        isOutline
        onClick={async () => {
          try {
            await downloadIonioRestorationFile(walletRepository, Object.values(accounts));
          } catch (e) {
            console.error(e);
            showToast(extractErrorMessage(e));
          }
        }}
      >
        Download
      </Button>
    </ShellPopUp>
  );
};

async function downloadIonioRestorationFile(
  walletRepository: WalletRepository,
  accounts: AccountDetails[]
) {
  throw new Error('not implemented');
  const ionioAccounts = accounts.filter(({ type }) => type === AccountType.Ionio);
  if (ionioAccounts.length === 0) throw new Error('no Ionio accounts found');
  const factory = await AccountFactory.create(walletRepository);
  const restoration: RestorationJSONDictionary = {
    liquid: [],
    testnet: [],
    regtest: [],
  };

  for (const details of ionioAccounts) {
    for (const net of details.accountNetworks) {
      const account = await factory.make(net, details.accountID);
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
}

function filterAccountsBySearchTerm(term: string) {
  return (account: string) => account.toLowerCase().includes(term);
}
export default SettingsAccounts;
