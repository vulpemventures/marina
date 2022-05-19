import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import LightningInvoiceView, {
  LightningInvoiceProps,
} from '../../../presentation/wallet/send/lightning-enter-invoice';
import { selectEsploraURL } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): LightningInvoiceProps => {
  return {
    network: state.app.network,
    explorerURL: selectEsploraURL(state),
  };
};

const LightningInvoice = connect(mapStateToProps)(LightningInvoiceView);

export default LightningInvoice;
