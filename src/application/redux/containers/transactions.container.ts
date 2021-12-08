import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import TransactionsView, { TransactionsProps } from '../../../presentation/wallet/transactions';
import { selectTransactions } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  network: state.app.network,
  transactions: selectTransactions(MainAccountID)(state),
  webExplorerURL: state.app.explorerByNetwork[state.app.network].electrsURL,
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
