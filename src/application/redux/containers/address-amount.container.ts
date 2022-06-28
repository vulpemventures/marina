import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { AddressAmountProps } from '../../../presentation/wallet/send/address-amount';
import AddressAmountView from '../../../presentation/wallet/send/address-amount';
import { selectBalances } from '../selectors/balance.selector';
import {
  selectAllAccountsIDsSpendableViaUI,
  selectChangeAccount,
} from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  changeAccount: selectChangeAccount(state),
  network: state.app.network,
  transaction: state.transaction,
  balances: selectBalances(...selectAllAccountsIDsSpendableViaUI(state))(state),
  transactionAsset: assetGetterFromIAssets(state.assets)(state.transaction.sendAsset),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
