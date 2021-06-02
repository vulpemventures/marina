import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { balancesSelector } from '../selectors/balance.selector';
import { assetGetterFromIAssets } from '../../../domain/assets';

const mapStateToProps = (state: RootReducerState): HomeProps => ({
  network: state.app.network,
  transaction: state.transaction,
  assetsBalance: balancesSelector(state),
  getAsset: assetGetterFromIAssets(state.assets)
});

const Home = connect(mapStateToProps)(HomeView);

export default Home;
