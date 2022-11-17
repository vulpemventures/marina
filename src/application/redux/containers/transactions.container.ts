import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { TransactionsProps } from '../../../presentation/wallet/transactions';
import TransactionsView from '../../../presentation/wallet/transactions';
import { selectElectrsURL, selectNetwork } from '../selectors/app.selector';
import {
  selectAllAccountsIDsSpendableViaUI,
  selectTransactions,
} from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  transactions: selectTransactions(...selectAllAccountsIDsSpendableViaUI(state))(state),
  webExplorerURL: selectElectrsURL(state),
  isWalletVerified: state.wallet.isVerified,
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
