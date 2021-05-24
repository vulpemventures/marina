import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import ConfirmationView, {
  ConfirmationProps,
} from '../../../presentation/wallet/send/confirmation';

const mapStateToProps = (state: RootReducerState): ConfirmationProps => ({
  transaction: state.transaction,
  network: state.app.network,
  assets: state.assets[state.app.network],
});

const Confirmation = connect(mapStateToProps)(ConfirmationView);

export default Confirmation;
