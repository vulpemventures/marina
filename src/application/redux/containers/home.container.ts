import { RootReducerState } from './../../../domain/common';
import { connect } from 'react-redux';
import HomeView, { HomeProps } from '../../../presentation/wallet/home';
import { balancesSelector } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): HomeProps => ({
  network: state.app.network,
  assets: state.assets,
  transaction: state.transaction,
  wallet: state.wallet,
  assetsBalance: balancesSelector(state),
});

const Home = connect(mapStateToProps)(HomeView);

export default Home;
