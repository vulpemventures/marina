import SettingsNetworksView, {
  SettingsNetworksProps,
} from './../../../presentation/settings/networks';
import { connect } from 'react-redux';
import { RootReducerState } from '../../../domain/common';
import { MainAccountID } from '../../../domain/account';
import { selectUpdaterIsLoading } from '../selectors/wallet.selector';

const mapStateToProps = (state: RootReducerState): SettingsNetworksProps => ({
  restorationLoading: state.wallet.deepRestorer.isLoading,
  accountsIDs: [MainAccountID],
  error: state.wallet.deepRestorer.error,
  updaterIsloading: selectUpdaterIsLoading(state),
});

const SettingsNetworks = connect(mapStateToProps)(SettingsNetworksView);

export default SettingsNetworks;
