import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import type { RootReducerState } from '../../../domain/common';
import type { TransactionsProps } from '../../../presentation/wallet/transactions';
import TransactionsView from '../../../presentation/wallet/transactions';
import { selectElectrsURL, selectNetwork } from '../selectors/app.selector';
import { selectTransactions } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  transactions: selectTransactions(MainAccountID)(state),
  webExplorerURL: selectElectrsURL(state),
  network: selectNetwork(state),
  isWalletVerified: state.wallet.isVerified,
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
