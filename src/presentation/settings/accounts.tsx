import ShellPopUp from '../components/shell-popup';
import type { Account } from '../../domain/account';
import ButtonList from '../components/button-list';

export interface SettingsAccountsProps {
  accounts: Account[];
}

const SettingsAccountsView: React.FC<SettingsAccountsProps> = ({ accounts }) => {
  return (
    <ShellPopUp
      backgroundImagePath="/assets/images/popup/bg-sm.png"
      className="h-popupContent container pb-20 mx-auto text-center bg-bottom bg-no-repeat"
      currentPage="Wallet accounts"
    >
      <div className="max-h-80">
        <ButtonList emptyText="" title="Accounts">
          {accounts.map((account) => (
            <div
              key={account.getAccountID()}
              className="hover:bg-blue-600 hover:text-blue-200 p-3 rounded-sm shadow-md"
            >
              <b>
                {account.getAccountID()} {account.isReady() ? '' : '(not ready)'} <br />
              </b>
            </div>
          ))}
        </ButtonList>
      </div>
    </ShellPopUp>
  );
};

export default SettingsAccountsView;
