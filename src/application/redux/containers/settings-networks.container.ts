import type { SettingsNetworksProps } from './../../../presentation/settings/networks';
import SettingsNetworksView from './../../../presentation/settings/networks';
import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';

const mapStateToProps = (state: RootReducerState): SettingsNetworksProps => ({
  restorationLoading: state.wallet.deepRestorer.isLoading,
  error: state.wallet.deepRestorer.error,
});

const SettingsNetworks = connect(mapStateToProps)(SettingsNetworksView);

export default SettingsNetworks;
