import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import TransactionsView, { TransactionsProps } from '../../../presentation/wallet/transactions';
import { selectElectrsURL } from '../selectors/app.selector';
import { selectTransactions } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  transactions: selectTransactions(MainAccountID)(state),
  webExplorerURL: selectElectrsURL(state),
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
