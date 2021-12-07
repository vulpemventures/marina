import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import TransactionsView, { TransactionsProps } from '../../../presentation/wallet/transactions';
import { selectElectrsURL } from '../selectors/app.selector';
import { walletTransactions } from '../selectors/transaction.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  transactions: walletTransactions(state),
  webExplorerURL: selectElectrsURL(state),
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
