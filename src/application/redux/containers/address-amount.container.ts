import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { AddressAmountProps } from '../../../presentation/wallet/send/address-amount';
import AddressAmountView from '../../../presentation/wallet/send/address-amount';
import { selectBalances } from '../selectors/balance.selector';
import { selectAllAccountsIDs, selectMainAccount } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): AddressAmountProps => ({
  changeAccount: selectMainAccount(state),
  network: state.app.network,
  transaction: state.transaction,
  balances: selectBalances(...selectAllAccountsIDs(state))(state),
  transactionAsset: assetGetterFromIAssets(state.assets)(state.transaction.sendAsset),
});

const AddressAmount = connect(mapStateToProps)(AddressAmountView);

export default AddressAmount;
