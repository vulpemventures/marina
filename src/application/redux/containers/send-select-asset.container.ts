import { connect } from 'react-redux';
import { MainAccountID } from '../../../domain/account';
import { RootReducerState } from '../../../domain/common';
import SendSelectAssetView, {
  SendSelectAssetProps,
} from '../../../presentation/wallet/send/send-select-asset';
import { selectNetwork } from '../selectors/app.selector';
import { selectAssets } from '../selectors/asset.selector';
import { selectBalances } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  return {
    balanceAssets: selectAssets(state),
    balances: selectBalances(MainAccountID)(state),
    network: selectNetwork(state),
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
