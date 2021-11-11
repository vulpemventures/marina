import { connect } from 'react-redux';
import { MainAccountID, RestrictedAssetAccountID } from '../../../domain/account';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import ReceiveSelectAssetView, {
  ReceiveSelectAssetProps,
} from '../../../presentation/wallet/receive/receive-select-asset';
import { selectBalances } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): ReceiveSelectAssetProps => {
  const balances = selectBalances(MainAccountID, RestrictedAssetAccountID)(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    network: state.app.network,
    assets: Object.keys(balances).map(getAsset),
    restrictedAssetSetup: state.wallet.restrictedAssetAccount !== undefined,
  };
};

const ReceiveSelectAsset = connect(mapStateToProps)(ReceiveSelectAssetView);

export default ReceiveSelectAsset;
