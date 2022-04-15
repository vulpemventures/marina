import type { SettingsAccountsProps } from './../../../presentation/settings/accounts';
import SettingsAccountsView from './../../../presentation/settings/accounts';
import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { selectAllAccounts } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): SettingsAccountsProps => ({
  accounts: selectAllAccounts(state),
});

const SettingsAccounts = connect(mapStateToProps)(SettingsAccountsView);

export default SettingsAccounts;
