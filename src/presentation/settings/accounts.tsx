import ShellPopUp from '../components/shell-popup';
import type { Account, AccountID } from '../../domain/account';
import ButtonList from '../components/button-list';
import AccountIcon from '../components/accountIcon';
import { setChangeAccount } from '../../application/redux/actions/app';
import { useDispatch } from 'react-redux';
import type { ProxyStoreDispatch } from '../../application/redux/proxyStore';
import classNames from 'classnames';
import InputIcon from '../components/input-icon';
import { useState } from 'react';

export interface SettingsAccountsProps {
  accounts: Account[];
  selectedChangeAccount: AccountID;
}

const SettingsAccountsView: React.FC<SettingsAccountsProps> = ({
  accounts,
  selectedChangeAccount,
}) => {
  const dispatch = useDispatch<ProxyStoreDispatch>();
  const [searchTerm, setSearchTerm] = useState('');

  const handleClick = async (account: Account) => {
    await dispatch(setChangeAccount(account.getInfo().accountID));
  };

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
          {accounts
            .filter(filterAccountsBySearchTerm(searchTerm))
            .map((account, index) => (
              <div
                key={index}
                className={classNames('p-3 rounded-md shadow-md', {
                  'border border-primary': account.getInfo().accountID === selectedChangeAccount,
                })}
                onClick={() => handleClick(account)}
              >
                <div className="flex-center flex align-middle">
                  <AccountIcon type={account.type} />
                  <span className="text-grayDark mt-1 align-text-bottom">
                    {account.getInfo().accountID} {account.getInfo().isReady ? '' : '(not ready)'} <br />
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
  return (account: Account) =>
    account.getInfo().accountID.toLowerCase().includes(term)
}

export default SettingsAccountsView;
