import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import PaymentSuccessView, {
  PaymentSuccessProps,
} from '../../../presentation/wallet/send/payment-success';

const mapStateToProps = (state: RootReducerState): PaymentSuccessProps => ({
  electrsExplorerURL: state.app.explorerByNetwork[state.app.network].electrsURL,
});

const PaymentSuccess = connect(mapStateToProps)(PaymentSuccessView);

export default PaymentSuccess;
