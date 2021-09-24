import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import ReceiveSelectAssetView, {
  ReceiveSelectAssetProps,
} from '../../../presentation/wallet/receive/receive-select-asset';
import { balancesSelector } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): ReceiveSelectAssetProps => {
  const balances = balancesSelector(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    network: state.app.network,
    assets: Object.keys(balances).map(getAsset),
  };
};

const ReceiveSelectAsset = connect(mapStateToProps)(ReceiveSelectAssetView);

export default ReceiveSelectAsset;
