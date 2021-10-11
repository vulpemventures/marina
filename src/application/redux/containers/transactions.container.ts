import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import TransactionsView, { TransactionsProps } from '../../../presentation/wallet/transactions';
import { selectAllTransactions } from '../selectors/transaction.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  network: state.app.network,
  transactions: selectAllTransactions(state),
  webExplorerURL: state.app.explorerByNetwork[state.app.network].electrsURL,
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
