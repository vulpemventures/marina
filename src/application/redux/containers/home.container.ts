import type { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import type { HomeProps } from '../../../presentation/wallet/home';
import HomeView from '../../../presentation/wallet/home';
import { selectBalances } from '../selectors/balance.selector';
import { assetGetterFromIAssets } from '../../../domain/assets';
import { lbtcAssetByNetwork } from '../../utils/network';
import { MainAccountID } from '../../../domain/account';

const mapStateToProps = (state: RootReducerState): HomeProps => {
  return {
    lbtcAssetHash: lbtcAssetByNetwork(state.app.network),
    transactionStep: state.transaction.step,
    assetsBalance: selectBalances(MainAccountID)(state),
    getAsset: assetGetterFromIAssets(state.assets),
  };
};

const Home = connect(mapStateToProps)(HomeView);

export default Home;
