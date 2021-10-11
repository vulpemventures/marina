import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { selectBalances } from '../selectors/balance.selector';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { selectLBTCforNetwork } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): HomeProps => ({
  lbtcAssetHash: selectLBTCforNetwork(state),
  network: state.app.network,
  transactionStep: state.transaction.step,
  assetsBalance: selectBalances(state),
  getAsset: assetGetterFromIAssets(state.assets),
  isWalletVerified: state.wallet.isVerified,
});

const Home = connect(mapStateToProps)(HomeView);

export default Home;
