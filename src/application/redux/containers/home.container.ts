import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { balancesSelector } from '../selectors/balance.selector';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { lbtcAssetByNetwork } from '../../utils';

const mapStateToProps = (state: RootReducerState): HomeProps => ({
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
  network: state.app.network,
  transactionStep: state.transaction.step,
  assetsBalance: balancesSelector(state),
  getAsset: assetGetterFromIAssets(state.assets),
});

const Home = connect(mapStateToProps)(HomeView);

export default Home;
