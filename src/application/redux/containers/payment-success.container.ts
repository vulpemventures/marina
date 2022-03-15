import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type {
  PaymentSuccessProps,
} from '../../../presentation/wallet/send/payment-success';
import PaymentSuccessView from '../../../presentation/wallet/send/payment-success';
import { selectElectrsURL } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): PaymentSuccessProps => ({
  electrsExplorerURL: selectElectrsURL(state),
});

const PaymentSuccess = connect(mapStateToProps)(PaymentSuccessView);

export default PaymentSuccess;
