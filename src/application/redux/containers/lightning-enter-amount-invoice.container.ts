import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import LightningAmountInvoiceView, {
  LightningAmountInvoiceProps,
} from '../../../presentation/wallet/receive/lightning-enter-amount-invoice';

const mapStateToProps = (state: RootReducerState): LightningAmountInvoiceProps => {
  return {
    network: state.app.network,
  };
};

const LightningAmountInvoice = connect(mapStateToProps)(LightningAmountInvoiceView);

export default LightningAmountInvoice;
