import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import ReceiveView, { ReceiveProps } from '../../../presentation/wallet/receive';
import { selectMainAccount } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ReceiveProps => ({
  account: selectMainAccount(state),
});

const Receive = connect(mapStateToProps)(ReceiveView);

export default Receive;
