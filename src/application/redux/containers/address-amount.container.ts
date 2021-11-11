import { connect } from 'react-redux';
import { MainAccountID, RestrictedAssetAccountID } from '../../../domain/account';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import AddressAmountView, {
  AddressAmountProps,
} from '../../../presentation/wallet/send/address-amount';
import { selectBalances } from '../selectors/balance.selector';
import { selectMainAccount } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  account: selectMainAccount(state),
  network: state.app.network,
  transaction: state.transaction,
  assets: state.assets,
  balances: selectBalances(MainAccountID, RestrictedAssetAccountID)(state),
  transactionAsset: assetGetterFromIAssets(state.assets)(state.transaction.sendAsset),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
