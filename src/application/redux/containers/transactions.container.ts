import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import TransactionsView, { TransactionsProps } from '../../../presentation/wallet/transactions';
import { selectElectrsURL } from '../selectors/app.selector';
import { selectToDisplayTxFunc, selectTransactions } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): TransactionsProps => ({
  assets: state.assets,
  getTransactions: async () => {
    const toDisplayTx = await selectToDisplayTxFunc(MainAccountID)(state);
    if (!toDisplayTx) return []; // account ID not found in redux state
    return selectTransactions(MainAccountID)(state).map(toDisplayTx);
  },
  webExplorerURL: selectElectrsURL(state),
});

const Transactions = connect(mapStateToProps)(TransactionsView);

export default Transactions;
