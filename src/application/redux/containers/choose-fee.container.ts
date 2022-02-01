import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import ChooseFeeView, { ChooseFeeProps } from '../../../presentation/wallet/send/choose-fee';
import { lbtcAssetByNetwork } from '../../utils/network';
import { selectBalances } from '../selectors/balance.selector';
import { selectTaxiAssets } from '../selectors/taxi.selector';
import { selectMainAccount, selectUtxos } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => ({
  network: state.app.network,
  assets: state.assets,
  balances: selectBalances(MainAccountID)(state),
  taxiAssets: selectTaxiAssets(state),
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
  sendAddress: state.transaction.sendAddress,
  changeAddress: state.transaction.changeAddresses[0],
  sendAsset: state.transaction.sendAsset,
  sendAmount: state.transaction.sendAmount,
  account: selectMainAccount(state),
  utxos: selectUtxos(MainAccountID)(state),
});

const ChooseFee = connect(mapStateToProps)(ChooseFeeView);

export default ChooseFee;
