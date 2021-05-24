import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import SelectAssetView, { SelectAssetProps } from '../../../presentation/wallet/send/select-asset';
import { balancesSelector } from '../selectors/balance.selector';

const mapStateToProps = (state: RootReducerState): SelectAssetProps => ({
  network: state.app.network,
  assets: state.assets,
  wallet: state.wallet,
  balances: balancesSelector(state),
});

const Home = connect(mapStateToProps)(SelectAssetView);

export default Home;
