import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { selectBalances } from '../selectors/balance.selector';
import { lbtcAssetByNetwork } from '../../utils/network';
import { MainAccountID } from '../../../domain/account';
import { selectAssets } from '../selectors/asset.selector';

const mapStateToProps = (state: RootReducerState): HomeProps => {
  return {
    lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
    transactionStep: state.transaction.step,
    assetsBalance: selectBalances(MainAccountID)(state),
    assets: selectAssets(state),
  };
};

const Home = connect(mapStateToProps)(HomeView);

export default Home;
