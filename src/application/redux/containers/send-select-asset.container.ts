import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { SendSelectAssetProps } from '../../../presentation/wallet/send/send-select-asset';
import SendSelectAssetView from '../../../presentation/wallet/send/send-select-asset';
import { selectNetwork } from '../selectors/app.selector';
import { selectAssets } from '../selectors/asset.selector';
import { selectBalances } from '../selectors/balance.selector';
import { selectAllAccountsIDsSpendableViaUI } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  return {
    balanceAssets: selectAssets(state),
    balances: selectBalances(...selectAllAccountsIDsSpendableViaUI(state))(state),
    network: selectNetwork(state),
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
