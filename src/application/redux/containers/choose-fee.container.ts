import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import ChooseFeeView, { ChooseFeeProps } from '../../../presentation/wallet/send/choose-fee';
import { lbtcAssetByNetwork } from '../../utils';
import { selectBalances } from '../selectors/balance.selector';
import { selectMainAccount, selectUtxos } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): ChooseFeeProps => ({
  network: state.app.network,
  assets: state.assets,
  balances: selectBalances(MainAccountID)(state),
  taxiAssets: state.taxi.taxiAssets,
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
  sendAddress: state.transaction.sendAddress,
  changeAddress: state.transaction.changeAddress,
  sendAsset: state.transaction.sendAsset,
  sendAmount: state.transaction.sendAmount,
  mainAccount: selectMainAccount(state),
  mainAccountUtxos: selectUtxos(MainAccountID)(state)
});

const ChooseFee = connect(mapStateToProps)(ChooseFeeView);

export default ChooseFee;
