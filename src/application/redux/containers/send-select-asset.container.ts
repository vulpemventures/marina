import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import SendSelectAssetView, {
  SendSelectAssetProps,
} from '../../../presentation/wallet/send/send-select-asset';
import { balancesSelector } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): SendSelectAssetProps => {
  const balances = balancesSelector(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    network: state.app.network,
    balanceAssets: Object.keys(balances).map(getAsset),
    balances,
  };
};

const SendSelectAsset = connect(mapStateToProps)(SendSelectAssetView);

export default SendSelectAsset;
