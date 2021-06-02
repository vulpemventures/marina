import { connect } from 'react-redux';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { RootReducerState } from '../../../domain/common';
import SelectAssetView, { SelectAssetProps } from '../../../presentation/wallet/send/select-asset';
import { balancesSelector } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): SelectAssetProps => {
  const balances = balancesSelector(state);
  const getAsset = assetGetterFromIAssets(state.assets);
  return {
    network: state.app.network,
    balanceAssets: Object.keys(balances).map(getAsset),
    balances,
  };
};

const Home = connect(mapStateToProps)(SelectAssetView);

export default Home;
