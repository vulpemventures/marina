import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import AddressAmountView, {
  AddressAmountProps,
} from '../../../presentation/wallet/send/address-amount';
import { selectBalances } from '../selectors/balance.selector';
import { masterPubKeySelector, selectRestorerOpts } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets,
  balances: selectBalances(state),
  masterPubKey: masterPubKeySelector(state),
  restorerOpts: selectRestorerOpts(state),
  transactionAsset: assetGetterFromIAssets(state.assets)(state.transaction.sendAsset),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
