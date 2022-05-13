import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import LightningAmountInvoiceView, {
  LightningAmountInvoiceProps,
} from '../../../presentation/wallet/receive/lightning-enter-amount-invoice';
import { selectEsploraURL } from '../selectors/app.selector';
import { selectMainAccount, selectUtxos } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): LightningAmountInvoiceProps => {
  return {
    network: state.app.network,
    account: selectMainAccount(state),
    explorerURL: selectEsploraURL(state),
    utxos: selectUtxos(MainAccountID)(state),
  };
};

const LightningAmountInvoice = connect(mapStateToProps)(LightningAmountInvoiceView);

export default LightningAmountInvoice;
