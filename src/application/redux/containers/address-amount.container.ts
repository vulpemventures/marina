import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import AddressAmountView, {
  AddressAmountProps,
} from '../../../presentation/wallet/send/address-amount';
import { balancesSelector } from '../selectors/balance.selector';
import { masterPubKeySelector } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets[state.app.network],
  balances: balancesSelector(state),
  masterPubKey: masterPubKeySelector(state),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
