import type { SettingsNetworksProps } from './../../../presentation/settings/networks';
import SettingsNetworksView from './../../../presentation/settings/networks';
import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';
import { selectAllAccountsIDs } from '../selectors/wallet.selector';
import { selectNetwork } from '../selectors/app.selector';

const mapStateToProps = (state: RootReducerState): SettingsNetworksProps => ({
  restorationLoading: state.wallet.deepRestorer.restorerLoaders > 0,
  network: selectNetwork(state),
  allAccountsIDs: selectAllAccountsIDs(state),
  error: state.wallet.deepRestorer.error,
});

const SettingsNetworks = connect(mapStateToProps)(SettingsNetworksView);

export default SettingsNetworks;
