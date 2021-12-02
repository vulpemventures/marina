import SettingsNetworksView, {
  SettingsNetworksProps,
} from './../../../presentation/settings/networks';
import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';

const mapStateToProps = (state: RootReducerState): SettingsNetworksProps => ({
  restorationLoading: state.wallet.deepRestorer.isLoading,
  error: state.wallet.deepRestorer.error,
  updaterIsloading: state.wallet.updaterLoaders.utxos || state.wallet.updaterLoaders.txs,
});

const SettingsNetworks = connect(mapStateToProps)(SettingsNetworksView);

export default SettingsNetworks;
