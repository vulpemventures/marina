import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import ReceiveSelectAssetView, {
  ReceiveSelectAssetProps,
} from '../../../presentation/wallet/receive/receive-select-asset';
import { selectAssets } from '../selectors/asset.selector';

const mapStateToProps = (state: RootReducerState): ReceiveSelectAssetProps => {
  return {
    network: state.app.network,
    assets: selectAssets(state),
  };
};

const ReceiveSelectAsset = connect(mapStateToProps)(ReceiveSelectAssetView);

export default ReceiveSelectAsset;
