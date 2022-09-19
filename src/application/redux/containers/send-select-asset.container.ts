import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import type { RootReducerState } from '../../../domain/common';
import type { SendSelectAssetProps } from '../../../presentation/wallet/send/send-select-asset';
import SendSelectAssetView from '../../../presentation/wallet/send/send-select-asset';
import { selectBalances } from '../selectors/balance.selector';
import { selectAllAccountsIDsSpendableViaUI } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  const balances = selectBalances(...selectAllAccountsIDsSpendableViaUI(state))(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    balanceAssets: Object.keys(balances).filter(asset => balances[asset] > 0).map(getAsset),
    balances,
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
