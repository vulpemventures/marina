import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import PaymentSuccessView, {
  PaymentSuccessProps,
} from '../../../presentation/wallet/send/payment-success';

const mapStateToProps = (state: RootReducerState): PaymentSuccessProps => ({
  network: state.app.network,
});

const PaymentSuccess = connect(mapStateToProps)(PaymentSuccessView);

export default PaymentSuccess;
