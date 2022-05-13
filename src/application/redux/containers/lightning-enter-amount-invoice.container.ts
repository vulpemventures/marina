import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import LightningAmountInvoiceView, {
  LightningAmountInvoiceProps,
} from '../../../presentation/wallet/receive/lightning-enter-amount-invoice';
import { selectEsploraURL } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): LightningAmountInvoiceProps => {
  return {
    network: state.app.network,
    explorerURL: selectEsploraURL(state),
  };
};

const LightningAmountInvoice = connect(mapStateToProps)(LightningAmountInvoiceView);

export default LightningAmountInvoice;
