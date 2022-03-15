import type {
  DeepRestorerProps,
} from './../../../presentation/settings/deep-restorer';
import SettingsDeepRestorerView from './../../../presentation/settings/deep-restorer';
import { connect } from 'react-redux';
import type { RootReducerState } from '../../../domain/common';

const mapStateToProps = (state: RootReducerState): DeepRestorerProps => ({
  restorationLoading: state.wallet.deepRestorer.isLoading,
  gapLimit: state.wallet.deepRestorer.gapLimit,
  error: state.wallet.deepRestorer.error,
});

const SettingsDeepRestorer = connect(mapStateToProps)(SettingsDeepRestorerView);

export default SettingsDeepRestorer;
