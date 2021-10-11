import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import ChooseFeeView, { ChooseFeeProps } from '../../../presentation/wallet/send/choose-fee';
import { lbtcAssetByNetwork } from '../../utils';
import { selectBalances } from '../selectors/balance.selector';
import { masterPubKeySelector, selectRestorerOpts } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => ({
  wallet: state.wallet,
  network: state.app.network,
  assets: state.assets,
  balances: selectBalances(state),
  taxiAssets: state.taxi.taxiAssets,
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
  masterPubKey: masterPubKeySelector(state),
  restorerOpts: selectRestorerOpts(state),
  sendAddress: state.transaction.sendAddress,
  changeAddress: state.transaction.changeAddress,
  sendAsset: state.transaction.sendAsset,
  sendAmount: state.transaction.sendAmount,
});

const ChooseFee = connect(mapStateToProps)(ChooseFeeView);

export default ChooseFee;
