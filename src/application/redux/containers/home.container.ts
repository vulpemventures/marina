import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { selectBalances } from '../selectors/balance.selector';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { lbtcAssetByNetwork } from '../../utils';
import { MainAccountID } from '../../../domain/account';

const mapStateToProps = (state: RootReducerState): HomeProps => ({
  lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
  transactionStep: state.transaction.step,
  assetsBalance: selectBalances(MainAccountID)(state),
  getAsset: assetGetterFromIAssets(state.assets),
  isWalletVerified: state.wallet.isVerified,
});

const Home = connect(mapStateToProps)(HomeView);

export default Home;
