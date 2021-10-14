import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import AddressAmountView, {
  AddressAmountProps,
} from '../../../presentation/wallet/send/address-amount';
import { balancesSelector } from '../selectors/balance.selector';
import { selectMainAccount } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  mainAccount: selectMainAccount(state),
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets,
  balances: balancesSelector(state),
  transactionAsset: assetGetterFromIAssets(state.assets)(state.transaction.sendAsset),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
