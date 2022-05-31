import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import type { ReceiveSelectAssetProps } from '../../../presentation/wallet/receive/receive-select-asset';
import ReceiveSelectAssetView from '../../../presentation/wallet/receive/receive-select-asset';
import { selectAssets } from '../selectors/asset.selector';

const mapStateToProps = (state: RootReducerState): ReceiveSelectAssetProps => {
  return {
    network: state.app.network,
    assets: selectAssets(state),
  };
};

const ReceiveSelectAsset = connect(mapStateToProps)(ReceiveSelectAssetView);

export default ReceiveSelectAsset;
