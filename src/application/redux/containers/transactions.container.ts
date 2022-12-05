import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { TransactionsProps } from '../../../presentation/wallet/transactions';
import TransactionsView from '../../../presentation/wallet/transactions';
import { selectNetwork, selectWebExplorerURL } from '../selectors/app.selector';
import {
  selectAllAccounts,
  selectAllAccountsIDsSpendableViaUI,
  selectTransactions,
} from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  transactions: selectTransactions(...selectAllAccountsIDsSpendableViaUI(state))(state),
  webExplorerURL: selectWebExplorerURL()(state),
  isWalletVerified: state.wallet.isVerified,
  accounts: selectAllAccounts(state),
  network: selectNetwork(state),
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
