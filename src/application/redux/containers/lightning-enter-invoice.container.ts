import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import LightningInvoiceView, {
  LightningInvoiceProps,
} from '../../../presentation/wallet/send/lightning-enter-invoice';
import { selectBalances } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): LightningInvoiceProps => {
  return {
    balances: selectBalances(MainAccountID)(state),
    network: state.app.network,
  };
};

const LightningInvoice = connect(mapStateToProps)(LightningInvoiceView);

export default LightningInvoice;
