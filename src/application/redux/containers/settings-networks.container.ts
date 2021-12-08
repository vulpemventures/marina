import SettingsNetworksView, {
  SettingsNetworksProps,
} from './../../../presentation/settings/networks';
import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import { MainAccountID } from '../../../domain/account';

const mapStateToProps = (state: RootReducerState): SettingsNetworksProps => ({
  restorationLoading: state.wallet.deepRestorer.isLoading,
  accountsIDs: [MainAccountID],
  error: state.wallet.deepRestorer.error,
});

const SettingsNetworks = connect(mapStateToProps)(SettingsNetworksView);

export default SettingsNetworks;
